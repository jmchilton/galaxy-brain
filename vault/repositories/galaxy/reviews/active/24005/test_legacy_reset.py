from galaxy.model import HistoryDatasetAssociation
from galaxy_test.base.populators import DatasetPopulator
from galaxy_test.driver.integration_util import IntegrationTestCase
from galaxy.tool_util.verify.test_data import TestDataResolver

class TestLegacyZarrMetadataReset(IntegrationTestCase):
    framework_tool_and_types = True
    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        config['metadata_strategy'] = 'directory'
        config['retry_metadata_internally'] = False
    def setUp(self):
        super().setUp()
        self.dataset_populator = DatasetPopulator(self.galaxy_interactor)
    def test_legacy_reset_retains_stale_store_root(self):
        pop = self.dataset_populator
        with pop.test_history() as history_id:
            with open(TestDataResolver().get_filename('wrapped_store.zarr.zip'),'rb') as archive:
                payload={'history_id':history_id,'targets':[{'destination':{'type':'hdas'},'items':[{'src':'pasted','paste_content':'','ext':'directory','extra_files':{'items_from':'archive','src':'files','fuzzy_root':False}}]}],'__files':{'files_0|file_data':archive}}
                response=pop.fetch(payload)
            response.raise_for_status();dataset_id=response.json()['outputs'][0]['id']
            pop.wait_for_history(history_id,assert_ok=True)
            session=self._app.model.context
            hda=session.get(HistoryDatasetAssociation,self._app.security.decode_id(dataset_id))
            # Emulate a persisted pre-change Zarr HDA; files are already wrapped from the archive.
            hda.extension='zarr';hda._metadata={'dbkey':['?'],'store_root':'wrapped.zarr','zarr_format':2};session.commit()
            response=self._put(f'histories/{history_id}/contents/{dataset_id}',data={'datatype':'zarr'},json=True)
            response.raise_for_status();pop.wait_for_history(history_id,assert_ok=True)
            session.expire_all();hda=session.get(HistoryDatasetAssociation,self._app.security.decode_id(dataset_id))
            extra=pop.get_history_dataset_extra_files(history_id,dataset_id=dataset_id)
            assert '.zgroup' in {item['path'] for item in extra},extra
            print('After API metadata reset, persisted metadata:',hda._metadata)
            assert hda._metadata.get('store_root')=='wrapped.zarr'
            run=pop.run_tool('zarr_store_root_compat',{'input':{'src':'hda','id':dataset_id}},history_id)
            job_id=run['jobs'][0]['id'];pop.wait_for_job(job_id,assert_ok=False)
            job=pop.get_job_details(job_id,full=True).json()
            print('Published-wrapper job state:',job['state']);print('Published-wrapper stderr:',job.get('stderr'))
            assert job['state']=='error',job

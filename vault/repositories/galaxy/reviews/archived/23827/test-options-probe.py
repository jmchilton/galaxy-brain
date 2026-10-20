import json
from test_galaxy_link_import import TestGalaxyLinkImportIntegration, _element

class TestOptionsProbe(TestGalaxyLinkImportIntegration):
    def test_options_probe(self):
        source = self.dataset_populator.new_history()
        self.dataset_populator.fetch({'history_id': source, 'targets': [{'destination': {'type': 'hdas'}, 'elements': [_element('a.bed', 'chr1\t1\t10\n')]}]}, wait=True)
        hda = self.dataset_populator.get_history_dataset_details(source)
        for include_files, policy in [(False, 'allow'), (True, 'force')]:
            prepared = self._post(f'histories/{source}/contents/datasets/{hda["id"]}/prepare_store_download', {'model_store_format': 'tar.gz', 'include_files': include_files}, json=True).json()
            self.dataset_populator.wait_for_download_ready(prepared['storage_request_id'])
            link = f'{self.url.rstrip("/")}/api/short_term_storage/{prepared["storage_request_id"]}'
            results = {}
            for suffix in ['contents_from_store', 'contents_from_store_async']:
                target = self.dataset_populator.new_history()
                response = self._post(f'histories/{target}/{suffix}', {'store_content_uri': link, 'model_store_format': 'tar.gz', 'discarded_data': policy}, json=True)
                response.raise_for_status()
                if suffix.endswith('_async'):
                    assert self.dataset_populator.wait_on_task(response)
                details = self._get(f'histories/{target}/contents?deleted=true').json() + self._get(f'histories/{target}/contents?deleted=false').json()
                results[suffix] = [{'state': d['state'], 'deleted': d['deleted'], 'visible': d['visible']} for d in details]
            print('DISCARD_POLICY_RESULT', json.dumps({'include_files': include_files, 'policy': policy, 'results': results}))
            assert results['contents_from_store'] != results['contents_from_store_async']

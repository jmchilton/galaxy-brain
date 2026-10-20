"""Independent real-API parity regression; run via confirm23827-runner.py."""
import json

def _element(name, content):
    return {'src': 'pasted', 'paste_content': content, 'name': name, 'ext': 'bed', 'dbkey': 'hg38', 'tags': ['group:demo']}

def check_policy_parity(self):
    source = self.dataset_populator.new_history()
    content = 'chr1\t1\t10\n'
    self.dataset_populator.fetch({'history_id': source, 'targets': [{'destination': {'type': 'hdas'}, 'elements': [_element('policy.bed', content)]}]}, wait=True)
    hda = self.dataset_populator.get_history_dataset_details(source)
    mismatches = []
    for include_files in (False, True):
        prepared = self._post(f'histories/{source}/contents/datasets/{hda["id"]}/prepare_store_download', {'model_store_format': 'tar.gz', 'include_files': include_files}, json=True)
        prepared.raise_for_status()
        prepared = prepared.json()
        self.dataset_populator.wait_for_download_ready(prepared['storage_request_id'])
        link = f'{self.url.rstrip("/")}/api/short_term_storage/{prepared["storage_request_id"]}'
        for policy in (None, 'allow', 'forbid', 'force'):
            results = {}
            for endpoint in ('contents_from_store', 'contents_from_store_async'):
                target = self.dataset_populator.new_history()
                payload = {'store_content_uri': link, 'model_store_format': 'tar.gz'}
                if policy is not None:
                    payload['discarded_data'] = policy
                response = self._post(f'histories/{target}/{endpoint}', payload, json=True)
                response.raise_for_status()
                if endpoint.endswith('_async'):
                    assert self.dataset_populator.wait_on_task(response)
                items = self._get(f'histories/{target}/contents?deleted=true').json() + self._get(f'histories/{target}/contents?deleted=false').json()
                assert len(items) == 1, items
                item = items[0]
                results[endpoint] = {key: item[key] for key in ('state', 'deleted', 'visible')}
                if item['state'] == 'ok':
                    assert self.dataset_populator.get_history_dataset_content(target, dataset_id=item['id']) == content
            expected_policy = policy or 'allow'
            expected = {'state': 'discarded' if not include_files or expected_policy == 'force' else 'ok', 'deleted': not include_files and expected_policy == 'forbid', 'visible': True}
            assert results['contents_from_store'] == expected
            print('INDEPENDENT_POLICY_RESULT', json.dumps({'files': include_files, 'policy': policy or 'omitted/default', 'expected': expected, 'results': results}), flush=True)
            if results['contents_from_store_async'] != expected:
                mismatches.append((include_files, policy, results))
    assert not mismatches, mismatches

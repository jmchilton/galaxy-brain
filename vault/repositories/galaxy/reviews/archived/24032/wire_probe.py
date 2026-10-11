import asyncio
import json
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from openai import AsyncOpenAI
from galaxy.webapps.galaxy.api.plugins import ChatCompletionRequest, FastAPIPlugins


async def main():
    controller = object.__new__(FastAPIPlugins)
    controller.config = SimpleNamespace(ai_api_key='test', ai_api_base_url='http://provider.test/v1', ai_model='server-model')
    messages = [
        {'role': 'system', 'content': 'client system'},
        {'role': 'user', 'content': [{'type': 'text', 'text': 'version?'}], 'name': 'analyst'},
        {'role': 'assistant', 'reasoning_content': 'call a tool', 'tool_calls': [{'id': 'call1', 'type': 'function', 'function': {'name': 'version', 'arguments': '{}'}}]},
        {'role': 'tool', 'content': [{'type': 'text', 'text': '26.1'}], 'tool_call_id': 'call1', 'x_vendor': {'tag': [1]}},
    ]
    base = {'messages': messages, 'model': 'client-model', 'temperature': 1.5, 'top_p': 0.1, 'n': 4}
    tools = [{'type': 'function', 'function': {'name': 'version'}}]
    variants = [
        ({'tools': []}, False),
        ({'tools': tools, 'parallel_tool_calls': False, 'reasoning_effort': 'low', 'tool_choice': {'type': 'function', 'function': {'name': 'version'}}}, False),
        ({'stream': True, 'stream_options': {'include_usage': True}}, True),
        ({'stream': False, 'stream_options': {'include_usage': True}, 'tools': None}, False),
    ]
    for extra, streaming in variants:
        captured = []
        def transport(request):
            body = json.loads(request.content)
            captured.append(body)
            if streaming:
                chunk = {'id': 'chat-test', 'object': 'chat.completion.chunk', 'created': 1, 'model': 'server-model', 'choices': [], 'usage': {'prompt_tokens': 1, 'completion_tokens': 2, 'total_tokens': 3}}
                return httpx.Response(200, headers={'content-type': 'text/event-stream'}, content=f'data: {json.dumps(chunk)}\n\ndata: [DONE]\n\n')
            return httpx.Response(200, json={'id': 'chat-test', 'object': 'chat.completion', 'created': 1, 'model': 'server-model', 'choices': []})
        http_client = httpx.AsyncClient(transport=httpx.MockTransport(transport))
        client = AsyncOpenAI(api_key='test', base_url='http://provider.test/v1', http_client=http_client)
        session = SimpleNamespace(closed=False)
        session.close = lambda: setattr(session, 'closed', True)
        trans = SimpleNamespace(sa_session=lambda: session)
        with patch('galaxy.webapps.galaxy.api.plugins.AsyncOpenAI', return_value=client):
            response = await controller._open_ai_adapter(trans, ChatCompletionRequest.model_validate(base | extra), 'plugin prompt', 'plugin')
        assert response.status_code == 200
        assert session.closed
        body = captured[0]
        assert body['messages'][2:] == messages[1:]
        assert [m['role'] for m in body['messages'][:2]] == ['system', 'system']
        assert body['model'] == 'server-model'
        assert (body['temperature'], body['top_p'], body['max_tokens']) == (0.3, 0.9, 1024)
        assert 'n' not in body
        if extra.get('tools'):
            assert body['tools'][0]['function']['parameters'] == {'type': 'object', 'properties': {}}
            assert body['parallel_tool_calls'] is False
            assert body['reasoning_effort'] == 'low'
            assert body['tool_choice'] == extra['tool_choice']
        else:
            assert 'tools' not in body
            assert not {'parallel_tool_calls', 'reasoning_effort', 'tool_choice'} & body.keys()
        if streaming:
            assert body['stream_options'] == {'include_usage': True}
            rendered = ''.join([chunk async for chunk in response.body_iterator])
            assert '"total_tokens": 3' in rendered
            assert rendered.endswith('data: [DONE]\n\n')
        else:
            assert 'stream_options' not in body
        await client.close()
    print('4 real-SDK transport scenarios passed (messages, omission, options, streaming, server settings, session release).')

asyncio.run(main())

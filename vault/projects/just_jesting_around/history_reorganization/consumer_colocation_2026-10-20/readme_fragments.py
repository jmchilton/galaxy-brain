"""Exact README replacements scheduled with the tests/helper APIs they describe."""
import re


def readability_fragments(base, final, groups):
    order={g['test']:i for i,g in enumerate(groups) if g.get('test')}
    def latest(paths):
        choices=[p for p in paths if p in order]
        if not choices:raise RuntimeError('No documented conversion owner: '+repr(paths))
        return max(choices,key=order.__getitem__)
    fragments=[]
    def add(label,before,after,helper=None,owner=None):
        assert after and final.count(after)==1,(label,final.count(after))
        fragments.append({'label':label,'before':before,'after':after,'requires_export':helper,'owner':owner})
    for label,pattern,heading,helper in (
      ('mounted-modal-helper',r'\*\*Mounted GModal\*\*:.*?\n\n','#### Pinia Store Testing',{'path':'client/src/components/BaseComponents/test-utils.ts','name':'clickModalButton'}),
      ('current-history-helper',r'`createTestingPinia\(\{ initialState \}\)`.*?\n\n','**Isolated Store Tests**:',{'path':'client/src/stores/testUtils.ts','name':'seedCurrentHistory'}),
    ):
        paragraph=re.search(pattern,final,re.S).group(0)
        add(label,heading,paragraph+heading,helper=helper)
    scope=re.search(r'Call composables directly.*?\n\n',final,re.S).group(0)
    general=scope.split(' If one creates watchers')[0]+'\n\n'
    add('effect-scope-helper',general,scope,helper={'path':'client/tests/vitest/effectScope.ts','name':'runInTestScope'})
    old_table=re.search(r'\| Pattern\s+\|.*?(?=#### Best Practices Summary)',base,re.S).group(0)
    new_table=re.search(r'\| Pattern\s+\|.*?(?=#### Teardown Dependencies)',final,re.S).group(0)
    table_owner=latest([
      'client/src/composables/taskMonitor.test.ts',
      'client/src/components/Workflow/Editor/Index.test.ts',
      'client/src/components/Tool/ToolForm.test.ts',
    ])
    add('rewritten-pattern-examples',old_table,new_table,owner=table_owner)
    teardown=re.search(r'Unmount components before restoring.*?(?=#### Best Practices Summary)',final,re.S).group(0)
    general=teardown.split(' See\n')[0]+'\n\n'
    add('teardown-conversion-examples',general,teardown,owner=latest([
      'client/src/components/Workflow/Import/TrsTool.test.ts',
      'client/src/components/Workflow/Run/WorkflowHelpDisplay.test.ts',
      'client/src/components/Workflow/Editor/WorkflowHelpDisplay.test.ts',
    ]))
    initial=final
    for fragment in reversed(fragments):initial=initial.replace(fragment['after'],fragment['before'],1)
    replay=initial
    for fragment in fragments:
        assert replay.count(fragment['before'])==1,fragment['label']
        replay=replay.replace(fragment['before'],fragment['after'],1)
    assert replay==final
    assert not any(n in initial for n in ('clickModalButton','seedCurrentHistory','runInTestScope'))
    return initial,fragments


def play_fragments(final,owner):
    # The audit describes the completed catalog, rather than framework setup.
    paragraph=re.search(r'Legacy violations are marked.*?\n\n',final,re.S).group(0)
    before=paragraph.replace('The initial\n[story-by-story audit](A11Y_AUDIT.md) records the exceptions. ','')
    assert before!=paragraph
    initial=final.replace(paragraph,before,1)
    assert initial.replace(before,paragraph,1)==final
    return initial,[{'label':'completed-accessibility-audit','before':before,'after':paragraph,'owner':owner}]

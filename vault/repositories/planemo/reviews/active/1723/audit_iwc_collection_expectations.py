import json,pathlib,copy,collections,sys
import planemo.cli
from planemo.runnable import for_path,cases
from galaxy.tool_util.parser.interface import TestCollectionOutputDef
root=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path('/tmp/iwc-1723-audit/iwc')
summary=collections.Counter();testpaths=set();errors=[];expectations=[];ignored=[]
for path in sorted(root.joinpath('workflows').rglob('*.ga')):
 runnable=for_path(str(path));loaded=cases(runnable)
 summary['workflows']+=1;summary['test_cases']+=len(loaded)
 for case in loaded:
  if case.tests_directory:testpaths.add(case.tests_directory)
  for name,value in case.output_expectations.items():
   summary['output_expectations']+=1
   if not isinstance(value,dict):continue
   before_collection='element_tests' in value
   after_collection=before_collection or value.get('class')=='Collection'
   if before_collection!=after_collection:errors.append((str(path.relative_to(root)),case.index,name,'changed checker selection'))
   if not after_collection:continue
   summary['collection_expectations']+=1
   v=copy.deepcopy(value);v['name']=name
   old=TestCollectionOutputDef.from_dict(copy.deepcopy(v));new=TestCollectionOutputDef.from_yaml_test_format(copy.deepcopy(v))
   fields=['collection_type','count','min','max','element_tests']
   differences=[f for f in fields if getattr(old,f)!=getattr(new,f)]
   if differences:errors.append((str(path.relative_to(root)),case.index,name,differences))
   assert not differences and before_collection,errors[-1:] if errors else ''
   if 'collection_type' in value.get('attributes',{}):ignored.append(dict(workflow=str(path.relative_to(root)),case=case.index,output=name,intended_type=value['attributes']['collection_type'],old_type=old.collection_type,new_type=new.collection_type))
   expectations.append(dict(workflow=str(path.relative_to(root)),case=case.index,output=name))
result={'counts':dict(summary),'changed_expectations':errors,'ignored_type_declarations':ignored,'expectations':expectations}
print(json.dumps({k:v for k,v in result.items() if k!='expectations'},indent=2))

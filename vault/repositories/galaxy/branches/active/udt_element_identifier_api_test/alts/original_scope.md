# original_scope

Branch `udt_element_identifier_api_test_alt_original_scope` on `jmchilton` (`791a5e46b83`): Baseline tests + UDT evaluator fix only. It doesn't include the parent's `9e50e37be66`, which carries the transient `element_identifier` onto implicitly converted HDAs in `actions/__init__.py` (this also affects XML/Cheetah tools and job-cache matching for converted inputs). In this alt, a mapped-over input that needs conversion still renders `null`.

# Priority map.pdf
Pages: 3


--- Page 1 ---

Priority  map
 
Priority  Type  What  to  change  
Critical  
Code  +  paper  
Add  stronger  evidence  against  the  Linear  Regression  baseline:  report  the  number  of  test  points  satisfying   
y≥0.20  
y ≥0.20
,
 
run
 
multiple
 
seeds
 
or
 
repeated
 
evaluation,
 
and
 
include
 
a
 significance  test  for  LR  vs  proposed;  the  paper  currently  reports  1,266  test  sequences  after  a  48-hour  lookback  and  gives  peak  RMSE  in  Table  7,  but  no  uncertainty  or  sample-count  support  for  the  peak  claim.   
Critical  
Code  +  paper  
Rework  the  scheduling  section  so  the  operational  gain  is  attributed  to  forecast  quality,  not  just  the  threshold  rule;  Table  11  currently  reports  a  0.15  threshold,  280  eligible  hours  out  of  1,266,  and  renewable-share  improvement  from  15.34  to  25.81  without  comparing  LR  vs  proposed  vs  perfect-foresight  under  the  same  rule.   
Critical  
Code  +  paper  
Either  provide  quantitative  blockchain  prototype  evaluation  or  explicitly  downgrade  the  blockchain  part  to  a  proposed  architecture;  the  manuscript  describes  IPFS/CID  anchoring,  keccak256  hashing,  smart  contracts,  and  a  7,000/10,000  PGS  gate,  but  it  also  says  gas  cost,  latency,  privacy,  and  consensus  evaluation  remain  future  work.   
Critical  
Paper,  or  remove  section  
Define  the  Predictive  Green  Score  with  an  exact  formula  and  calibration  procedure;  the  introduction  describes  a  0–100  confidence  score,  while  the  system  section  uses  an  on-chain  

--- Page 2 ---

7,000/10,000  threshold,  and  the  future-work  section  still  says  calibrated  confidence  scores  need  to  be  incorporated.   
Critical  
Paper,  unless  justified  by  code  
Clarify  or  delete  the  “optimized  oracle  export”  in  Table  8;  the  paper  reports  3,360  rows  and  RMSE  0.000170  for  the  optimized  oracle  export,  which  is  dramatically  smaller  than  the  main  test  RMSE  0.007337,  but  the  mechanism  is  not  clearly  defined  in  the  manuscript.   
High  Paper  
Rewrite  abstract,  results,  discussion,  and  conclusion  to  state  parity  with  Linear  Regression  on  global  metrics;  Table  6  shows  LR  test  RMSE/R²  of  0.007334/0.988058  and  the  proposed  model  at  0.007337/0.988050,  while  the  abstract  still  highlights  25.3%  better  RMSE  and  44.2%  lower  unexplained  variance  versus  Random  Forest.   
High  
Code  +  paper  
Add  stronger  contemporary  baselines  if  feasible;  the  current  benchmark  set  includes  LSTM,  GRU,  BiLSTM,  XGBoost,  Linear  Regression,  and  Random  Forest,  while  the  literature  review  discusses  transformer-family  models  without  benchmarking  them.   
High  Paper  
Unify  naming  everywhere;  the  manuscript  alternates  among  labels  such  as  “residual  decomposition-based  model,”  “proposed  residual,”  “attention-based  BiLSTM  residual  learner,”  and  historical  EA-BiLSTM  variants.   
High  Paper  
Reconcile  internal  inconsistencies  across  tables  and  text;  examples  include  best  validation  loss  shown  as  4.23×10 ⁻⁵  in  Table  4  versus  4.2252×10 ⁻⁵  in  the  text,  and  standalone  BiLSTM  results  differing  from  EA-BiLSTM  v1  results  across  Tables  5,  6,  9,  and  10.   

--- Page 3 ---

Medium  Paper  
Fix  the  implementation  description  in  the  introduction;  the  intro  says  the  RNN  works  on  “minutes  to  hours”  and  “10–15  minutes,”  but  the  methodology  clearly  states  a  48-hour  lookback  sequence  with  10  input  channels.   
Medium  Paper  
Remove  or  rephrase  the  near-zero  residual-mean  argument;  the  manuscript  currently  presents  the  training  residual  mean  “approximately  0.000000”  as  evidence,  which  is  not  a  meaningful  empirical  result  in  this  setup.   
Medium  Paper  
Tighten  writing  and  presentation;  the  manuscript  contains  repeated  explanations  across  results/discussion,  the  typo  “REASEARCH  GAPS,”  and  inconsistent  capitalization  such  as  LSTM/BiLSTM  variants  and  mid-sentence  all-caps  terms.   
 
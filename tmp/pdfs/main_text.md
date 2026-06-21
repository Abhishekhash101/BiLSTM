# main.pdf
Pages: 19


--- Page 1 ---

Date of current version April 18, 2026.
Digital Object Identifier 10.1 109/ACCESS.2026.XXXXXXX
A Residual Decomposition Framework with
Attention-Based Sequence Modeling for
Renewable Energy Forecasting and
Blockchain-Anchored Scheduling
ANKIT SUBEDI 1, DEEPIKA J 2, ABHISHEK KUMAR 3, and LIZ ALEX 4
1Department of Information Security, School of Computer Science and Engineering, VIT University, V ellore, Tamil Nadu, India (e-mail:
ankit.subedi2023@vitstudent.ac.in)
2Department of Information Security, School of Computer Science and Engineering, VIT University, V ellore, Tamil Nadu, India (e-mail: deepika.j@vit.ac.in;
ORCID: 0000-0002-1246-4609)
3Department of Information Technology, School of Computer Science Engineering and Information Systems, VIT University, V ellore, Tamil Nadu, India (e-mail:
abhishek.kumar2024d@vitstudent.ac.in)
4Department of Computer Science Engineering, School of Computer Science and Engineering, VIT University, V ellore, Tamil Nadu, India (e-mail:
liz.alex2024@vitstudent.ac.in)
Corresponding author: Deepika J (e-mail: deepika.j@vit.ac.in).
ABSTRACTThe need to accurately predict renewable energy production over a short time period is
important in order to operate a smart grid. It also allows for better coordination of energy storage and
provides an opportunity to improve how efficiently energy is produced and used through "energy aware"
scheduling. Forecasting errors are typically larger during the periods when there is higher variability in
renewable generation output. Therefore, this research introduces a residual decomposition based predictive
model that integrates an easily understood linear base line model with a low computational cost attention-
based Bidirectional Long Short Term Memory (BiLSTM) residual learner. A blockchain-based oracle layer
has been included in the design of the model so that forecasts can be utilized as anchor points for scheduling.
The basis for designing the above described model was the results of analyzing failures of using Recurrent
Neural Network (RNN) models independently as well as the numerous architectures developed by attempting
to refine these independent RNN models. As previously stated, the primary focus of this study is to develop
a residual decomposition-based forecasting model. In developing the model, the forecasting problem was
decomposed into two component parts. The first part is a deterministic and linear component and was
modeled using Multivariate Linear Regression (MLR). The MLR model represents the majority of the
structure found in the renewable generation data collected for Tamil Nadu and includes both the major
linear trends and diurnal patterns. The second component part of the problem is a stochastic component
and is represented by a BiLSTM model. The BiLSTM model will learn from only the residual error left after
applying the MLR model to all variables. Data for testing were created using eight thousand seven hundred
sixty hours of actual renewable generation data collected from solar panels located at four sites in India.
Real world generated loads and storages have been added to these data sets. These data sets provide realistic
physical groundings for each of the three variables (load, renewable generation, and energy storage) that are
being modeled. The proposed model achieved a Root Mean Square Error (RMSE) of .007337 and Mean
Absolute Error (MAE) of .005312, while achieving an R-Squared value of .98805. When comparing the
performance of the proposed model to that of Random Forest, it can be concluded that the proposed model
performed approximately twenty-five percent better than Random Forest in terms of RMSE and forty-four
percent better than Random Forest in terms of unexplained variance. Finally, the oracle layer within the
proposed model serializes predictions into canonical JSON objects. Each object is then hashed through Inter
Planetary File System (IPFS), blockchain hashing, and then exposed to smart contracts as verifiable control
signals. System-level evaluation shows that forecast-gated operation increases renewable utilization from
15.34
INDEX TERMSAttention mechanism, bidirectional LSTM, blockchain oracle, energy-aware scheduling,
residual decomposition, renewable energy forecasting, smart grid.
1

--- Page 2 ---

I. INTRODUCTION
R
ENEW ABLE energy forecasting is now a core require-
ment for power-system operation because solar and
wind production varies with weather, time of day, and season.
As renewable penetration increases, grid operators must make
dispatch, storage, and scheduling decisions under greater
uncertainty. Forecast error during peak-generation or tran-
sition periods can lead to underutilized renewable energy,
unnecessary curtailment, increased reserve requirements, and
inefficient downstream decisions [1]–[6]. These effects are
especially important in smart-grid settings where energy-
aware compute scheduling, peer-to-peer energy exchange,
and distributed control depend on forecast signals that are
both accurate and auditable.
As such, this research developed a new approach to fore-
casting the total renewable energy output in a given area.
To achieve this goal, the research team used a residual de-
composition methodology. As opposed to a traditional ap-
proach where all variables are fed into a singular predictive
algorithm, the residual decomposition methodology splits the
forecasting process into two components. First, the model
predicts the major renewable energy generating trends using
a straightforward and easy-to-understand statistical model, in
this case, Linear Regression. Second, the residuals generated
by the initial model are then fed into another model that fo-
cuses solely on predicting any remaining non-linear patterns
in the data. The second stage of this methodology employs a
Recurrent Neural Network (Bi-LSTM) to learn from histor-
ical renewable energy output data and predict future values.
The RNN was designed to look at the data over short-term
horizons (typically minutes to hours). Since there is no need
to include past values that have been explained by the first
model, the RNN only needs to analyze small sequences of
hourly values (typically around 10-15 minutes). By limiting
its scope to analyzing relatively short sequences of hourly
values, the RNN becomes much smaller and easier to train
compared to other types of neural networks. Additionally, the
use of attention weights allows the network to prioritize which
hourly values are most relevant for making forecasts.
Lastly, after each hour’s value has been predicted, the
model produces a green score. The green score represents
how confident the model is in its predictions. The scores
range from 0 to 100, and higher scores represent greater
confidence. The green score serves as a threshold value for
smart contracts. If the green score exceeds a predetermined
threshold level (e.g., 80), the contract is executed. Other-
wise, it is rejected. This prevents unnecessary trades from
occurring based on poorly supported predictions. To further
support the development of this platform and ensure trust-
worthiness within multi-party environments, the authors inte-
grated their forecasting model with an oracle-style blockchain
layer. The oracle layer records forecast payloads in canonical
JSON format and anchors their digital fingerprints onto the
blockchain. The validated forecasts are then available as in-
puts for renewable-aware scheduling and trading decisions.
Therefore, the proposed method includes: * ML Fore-
castCanonical JSONIPFS CIDHash Anchor
Blockchain V alidationTrading/Scheduling. * Blockchain
is not just a separate tool applied after prediction but instead
serves as the underlying decision-making infrastructure al-
lowing various stakeholders to utilize tamper-proof forecast
signals for scheduling/trading/execution validation.
Overall, this research contributes to three key areas:
1) Introduces a residual decomposition framework for
renewable energy forecasting separating deterministic
structure from stochastic deviations enhancing model
interpretability and learning efficiency.
2) Proposes a lightweight attention-based BiLSTM archi-
tecture operating on residual error to enable focused
learning of nonlinearities and peak-hour anomalies.
3) Integrates forecasting with blockchain-based oracle
mechanisms to create tamper-evident anchorages of
predictions serving as verifiable control signals in de-
centralized renewable-energy trading/scheduling sys-
tems.
Through empirical evaluations utilizing real-world data
collected from the Tamil Nadu Grid Corporation Ltd, this re-
search demonstrated that scheduling renewables based upon
accurate forecasts can lead to significant increases in overall
renewable utilization.
Additionally, this research demonstrated empirically that
residual-learning achieves similar levels of performance as
strong linear-baseline approaches while offering better per-
formance in nonlinear operating regimes.
II. LITERATURE REVIEW
A. RENEWABLE ENERGY FORECASTING
Renewable energy forecasting has been studied using sta-
tistical, physical, machine-learning, and deep-learning ap-
proaches [3], [7]–[12]. Classical time-series methods such
as ARIMA and SARIMA provide interpretable temporal
baselines and remain useful when seasonality is stable [13],
[14]. However, renewable generation is affected by nonlinear
interactions between irradiance, wind speed, installed capac-
ity, and operational constraints. Machine-learning methods
therefore became popular because they can map nonlinear
feature interactions without requiring a full physical model
[18]–[20].
B. CLASSICAL MACHINE-LEARNING MODELS
Linear Regression is often competitive in structured energy
datasets because generation profiles contain strong deter-
ministic patterns from diurnal cycles and installed-capacity
effects. Random Forest, extremely randomized trees, and
gradient-boosted methods can capture nonlinear relationships
and feature interactions [21]–[25], but they do not directly
model temporal sequence order unless lagged features are
manually encoded. In the present work, both Linear Regres-
sion and Random Forest are used as baselines, while the
proposed model uses the linear component as a deterministic
anchor rather than treating it only as a competitor.
2

--- Page 3 ---

C. RECURRENT SEQUENCE MODELS
The long short-term memory (lstm) network was developed
to deal with the issue of vanishing gradients in recurrent
models [26]. Additionally, gated recurrent units, encoder-
decoder SEQUENCE MODELS, and probabilistic recurrent
forecasters extended the application of deep sequence mod-
els for predicting time series based on sequences [27]–[29].
Furthermore, bidirectional recurrent networks expanded upon
the previous idea of using a SEQUENCE model to process
a sequence in both forward and backward directions to cre-
ate richer contextual representations over the input window
[30]. In forecasting, bilstm MODELS can utilize the temporal
context from windows of historical measurements. However,
a standalone recurrent learner could be inefficient when the
target includes a large deterministic portion. Therefore, the
recurrent model would need to learn both the smooth di-
urnal pattern and the irregular weather driven deviation si-
multaneously. Learning this information simultaneously can
result in less efficient parameters, less effective convergence
rates, and less stable improvements compared to other simpler
baselines. Residual learning is able to overcome the issues
created by inefficiencies resulting from learning both patterns
simultaneously, because it requires the SEQUENCE model to
focus solely on learning the deviations about a strong baseline
[31]–[33].
D. ATTENTION AND TRANSFORMER-BASED MODELS
Models utilizing Attention mechanisms are capable of
weighting different temporal positions in relation to how
relevant they are to the task being modeled [34], [35]. The
transformer architecture expands upon this concept via self-
Attention and has resulted in many successful applications
within sequence modeling [36]. V ariants of the temporal se-
ries transformer architecture, including temporal fusion trans-
former, informer, autoformer, FED-former, PatchTST, and
TimesNet have also improved upon multi-horizon forecasting
and long-sequence modeling [37]–[42]. However, traditional
transformer architectures require quadratic memory growth
with increasing sequence lengths and generally require larger
training sets than standard models. They also make significant
sacrifices regarding compactness that makes edge deploy-
ment appealing. Given moderately sized datasets and real-
time deployment scenarios, lightweight Attention-based re-
current models may serve as a more practical approach to
achieve comparable results to full transformer architectures.
Preliminary experiments conducted on the Tamil Nadu task
demonstrated that multiple energy aware Attention variants
produced minor marginal improvement before reaching a
plateau – Attention added additional optimization complexity
and increased the risk of overfitting instead of providing net
performance gains. Due to these findings, the decision was
made to pursue a residual decomposition strategy instead of
continuing to develop further standalone Attention.
E. BLOCKCHAIN-BASED ENERGY SYSTEMS
The use of blockchain technology has also received a signifi-
cant amount of attention in terms of Transactive Energy (TE),
Peer-to-Peer (P2P) Markets, Smart Contracts, and Decen-
tralized Settlement [43]–[51], all of which enhance system-
wide transparency by removing the dependence upon a single
trusted entity. Most however rely upon historical meter reads
or ex-post transactional logs. In contrast prior energy trading
platforms have primarily focused on Bidding, Clearing, Es-
crow and/or Settlement; while predictive accuracy is typically
the focus of forecasting studies. Only a few research efforts
provide both an auditable link from predictive payloads to
their associated anchoring within Interplanetary File Sys-
tem (IPFS) and enforcement via On-Chain Gating Logic.
Therefore Trustworthy Oracle Mechanisms, Decentralized
Data Feeds and Authenticated Off-Chain Computation are
important considerations with regards to Blockchains that
rely on Physical World Measurements or Machine-Learning
Predictions [52]–[56]. As such there is a need for a Se-
cure Auditable Framework whereby Predictive Models may
function as Trusted Inputs to Decentralized Decision-Making
Processes. The above gaps are summarized in Table 1.
F. REASEARCH GAPS AND PROBLEM FORMULATION
Three coupled gaps exist among the reviewed literature that
motivate this study. First, although prior renewable forecast-
ing studies have treated the full generation signal as a sin-
gular target for learning capabilities of nonlinear MODELS,
this forces those same MODELS to re-learn deterministic
diurnal structures that simpler baselines already effectively
capture efficiently; this waste of model capacity reduces
robustness in high variability environments. Second, there
is little documentation of failure modes among prior eval-
uations of deep learning for energy forecasting. That is to
say, when standalone recurrent MODELS perform worse
than linear baselines, there is rarely documented evidence
on why such occurred or what architectural modifications
were attempted; thus practitioners lack actionable knowledge.
Finally, blockchain-based energy platforms and forecasting
research are largely independent of one another; energy trad-
ing systems document transactions but do not document veri-
fiable forecasts, whereas forecasting studies document accu-
racy metrics but do not provide an auditable means of enforc-
ing signals for scheduling and trading purposes. There is no
currently available integrated framework that serializes ML
forecast payload outputs into distributed storage systems and
utilizes them as on-chain gate logic for determining trading
decisions. The proposed residual decomposition framework
with blockchain oracle integration provides solutions for each
of these three gaps.
III. SYSTEM OVERVIEW
A. INTEGRATED FORECASTING AND DECISION
ARCHITECTURE
As shown in Fig. 1, the proposed integrated framework links
forecasting, validation and scheduling within one decision
3

--- Page 4 ---

TABLE 1.Comparison of Existing Models and Research Gaps
Model / Approach Key Strength Limitation Gap Identified Proposed Advantage
Linear Regression
(LR)
Simple, interpretable, and
strong for structured
deterministic data
Cannot capture nonlinear and
peak variations
Poor behavior in critical
nonlinear regions
Residual learning models
nonlinear deviations
separately
Random Forest (RF) Captures nonlinear
relationships and feature
interactions
Lacks explicit temporal
sequence modeling
Ignores ordered
dependencies in energy data
BiLSTM captures temporal
dynamics effectively
LSTM Models temporal
dependencies through gated
recurrence
Learns the full signal and
may spend capacity on
deterministic structure
Overburdened by
deterministic and stochastic
components
Residual decomposition
reduces learning complexity
BiLSTM Captures bidirectional
temporal context
Still processes the full target
uniformly when used alone
Limited focus on
high-impact deviations
Attention emphasizes
influential residual windows
Transformer Powerful self-attention and
parallel processing
Higher computational cost
and data demand
Less suitable for moderate
datasets and edge use
Lightweight
attention-BiLSTM provides
an efficient alternative
Blockchain Energy
Systems
Transparency,
decentralization, and
auditable settlement
Often depend on historical or
static data
Forecast signals are not
integrated as verifiable
control inputs
Oracle-based anchoring
enables trusted
forecast-driven decisions
pathway. Renewable data from Tamil Nadu is used to create
both cyclical and physical features from modeled and ob-
served operating data. The residual structure learned by the
attention based BiLSTM model plus a linear baseline repre-
sents the dominant deterministic relationship. The corrected
forecast along with some additional information (metadata)
is then forwarded to an oracle layer for validation/anchoring
prior to being consumed by either scheduling/trading logic.
Thus, the key architectural contribution is that these three
layers (forecasting, blockchain decision, and actuation) were
developed together. Forecasting was not treated as a sec-
ondary product; rather, it is the primary operational variable
determining if trading or energy intensive execution should
occur.
B. BLOCKCHAIN AS DECISION-LA YER INFRASTRUCTURE
In the design of this integrated framework, we have chosen
to utilize blockchain as our decision-layer infrastructure due
to its ability to provide trust, transparency, and tamper-proof
validation in multi-party energy systems. With respect to tra-
ditional central-architecture models, which require a single,
trusted authority to disseminate forecasts and make control
decisions, blockchain enables decentralized verification of
forecast integrity. Through the process of hashing (via crypto-
graphic hashing) and distributed-consensus mechanisms, this
system provides assurance that forecast-driven scheduling
and/or trading decisions are auditable and cannot be manip-
ulated by any actor. This is particularly important in peer-to-
peer energy networks, renewable-aware compute-scheduling
environments and other decentralized demand response appli-
cations where numerous actors will need to operate under a
set of shared forecast signals without requiring a single entity
responsible for creating all of those forecasts.
The mechanism of integrating the two is as follows: af-
ter forecasting has occurred, a validation node bundles the
forecasted value along with the current snapshot of relevant
feature attributes, timestamp and the metadata associated with
the current schedule eligibility into a canonical JSON object.
It is crucial to serialize this object deterministically because
standard JSON objects may vary by key ordering, whitespace,
etc., depending upon environment; failure to do so could
result in identical logical forecasts producing different hash
values. Once serialized, the payload is written out-of-chain
to the Interplanetary File System (IPFS), which returns a
Content Identifier (CID). At the same time, the payload is
hashed using a compatible Ethereum Virtual Machine (EVM)
function (keccak256) and only the compact fingerprint of
the payload along with the CID and associated renewable
score are stored on-chain to prevent blockchain bloat while
maintaining full verifiability.
Therefore, the oracle layer performs four functions. First,
it validates the forecast payload and metadata. Second, it
calculates a cryptographic digest of the forecast object. Third,
it anchors the digest to a ledger record via consensus. Finally,
it exposes the validated forecast as an input to decision-layer
scheduling and/or trading logic. There are three Smart Con-
tracts making up the on-chain components of the platform:
PredictionStorage anchors the IPFS CID and keccak256 hash
for each forecast payload providing immutable provenance;
EnergyTrading utilizes the forecast gated Predictive Green
Score to govern or restrict order execution and escrow to
only allow trades when the PGS is greater than the on-chain
confidence threshold of 7000 on a 10000 integer scale (so-
lidity compatible fixed point representation); finally there is
an overlay TradeDispute Smart Contract managing disputed
settlements through a win/lose resolution mechanism. The
platform utilizes an ENRG native token to denote energy trade
settlement amounts thereby linking financial incentives with
renewable availability signals. Therefore, the entire pipeline
is: ML Forecast -> Canonical JSON -> IPFS CID -> Hash
Anchor -> Blockchain V alidation -> Trading/Scheduling.
IV. METHODOLOGY
4

--- Page 5 ---

FIGURE 1.Residual forecasting and blockchain-anchored decision infrastructure. The figure shows the full path from Tamil Nadu renewable observations
to residual forecasting, oracle validation, ledger anchoring, and scheduling. The key insight is that blockchain acts as the trust and decision infrastructure
for forecast use, not a detached storage layer. The conclusion is that forecasts become auditable control signals for decentralized energy operation.
A. PROBLEM FORMULATION
Letx t denote the multivariate feature vector at timet, includ-
ing renewable capacity factors, generated power, modeled
load, modeled state of charge, and cyclical time encodings.
The targety t is the normalized renewable-generation signal
in log-transformed form:
yt = log

1 + Pgen
t
Ppeak

,(1)
whereP gen
t is total renewable generation andP peak is the peak-
load normalization constant. In addition to usingX t−L+1:t as
an input to estimatey t , the model also uses the data from
Xt−L+1:t with a look back windowL. The main issue facing
this problem is that the series can be viewed as having both
linear and nonlinear components. A majority of the compo-
nent that represents the state in the series is a function of time
and includes a strong periodic nature due to its association
with the sun’s position relative to earth and to the periodic
nature of wind patterns. This portion of the series will have
a very high degree of predictability. However, there are some
other portions of the series that reflect abrupt changes (due
to unusual localized weather conditions) or variations in load
on the storage systems and these represent a much lower
frequency of occurrence but are operationally significant. If
the model does not account for the predictable aspects of the
series it would essentially be "re-learning" obvious patterns.
On the other hand if the model ignores the less predictable
aspects of the series it would produce systematic errors during
peak usage periods when energy decisions are most impor-
tant.
B. DATASET CONSTRUCTION
The core renewable generation data used in this study is
obtained from real-world hourly observations representing
Tamil Nadu grid conditions. To evaluate system-level inter-
actions such as scheduling and storage dynamics, additional
variables including load demand and battery state are incor-
porated using physically grounded modeling approaches.
The raw renewable data are drawn from the GridPath India
long-term power-system planning dataset, which provides
hourly capacity-factor traces for solar and wind resources
[57]. The underlying resource traces are consistent with com-
mon renewable resource data products and reanalysis work-
flows used in wind and solar studies [58]–[61]. Tamil Nadu
records are filtered from fixed-tilt solar PV , single-axis solar
PV , rooftop solar PV , and adjusted existing wind folders. Each
source is checked for hourly continuity, missing timestamps,
duplicate timestamps, and null values. The final hourly re-
newable table contains 8,760 observations for calendar year
2019.
Modeled load is represented with a deterministic daily
profile bounded between 7,000 MW and 14,000 MW. Mod-
eled battery state of charge (SoC) follows configured stor-
age limits, charge/discharge efficiencies, and maximum rate
constraints. These modeled components are introduced to
provide a consistent evaluation environment for the proposed
forecasting and scheduling framework and do not replace the
underlying real-world generation data.
C. PREPROCESSING PIPELINE
The preprocessing pipeline performs deterministic file dis-
covery, schema validation, Tamil Nadu filtering, timestamp
parsing, per-folder aggregation, and final merge. Capacity
factors are averaged across Tamil Nadu projects at each times-
tamp. Cyclical features are encoded as
hsin
t = sin
 2πht
24

,h cos
t = cos
 2πht
24

,(2)
5

--- Page 6 ---

TABLE 2.Dataset and Feature Summary
Item Description
Temporal coverage 8,760 hourly observations from January 1 to
December 31, 2019
Region Tamil Nadu, India
Renewable inputs Fixed-tilt solar, single-axis solar, rooftop solar,
and adjusted existing wind capacity factors
Modeled variables Load demand, battery SoC, and scheduling
eligibility variables
Target Log-transformed renewable generation,
log(1 +P gen/Ppeak )
Feature set Renewable factors,P gen,P load , SoC, hour
sine/cosine, and day sine/cosine
System-level data A 15-minute, five-node engineered trace in
data_processedfor oracle-facing
prediction streams
with analogous encodings for day of year. These encodings
prevent artificial discontinuity between adjacent hours such
as 23:00 and 00:00.
D. RESIDUAL DECOMPOSITION LOGIC
The residual decomposition first trains a Linear Regression
modelf LR:
ˆyLR
t =f LR(Xt−L+1:t ).(3)
The residual target is then defined as
rt =y t − ˆyLR
t .(4)
While this approach transforms the forecasting problem into
a residual model for residuals, the large part of the overall de-
terministic nature is modeled using the linear model as well.
Thus, the sequence model can focus solely on the stochastic
errors in the data stream. By removing much of the variation
and complexity from the original target signal through its
reduction to a residual, the learning process becomes more
efficient and stable regarding convergence of the non-linear
models. By decomposing the learning problems in such a
manner, we can ensure that the non-linear model will learn
to recognize local anomalies based upon their proximity to
zero (near-zero mean) rather than attempting to reproduce the
entire signal. As confirmed during the notebook run, when
trained, the mean of the training residuals is approximately
0.000000 indicating that the residual models operate at or
very near a target value of zero. The concept is similar to
decomposition-based forecasting as well as residual learning
where different types of trend, seasonality, etc. are sepa-
rated to minimize complexity of targets [15]–[17], [31], [32].
Statistically speaking, this will reduce the variance of your
targets. Y our original targets contain some form of smooth
deterministic structure as well as sparse anomalous behav-
ior. Isolating these anomalies within a residual provides you
with a lower variance learning problem which is significantly
easier to optimize. From exploratory analysis of residuals in
regards to testing identified 64 extremely non-linear points
out of 1266 sample points taken from testing. That repre-
sents 5.1 percent of all sample points. There was no uni-
form distribution of these points; they were concentrated at
high-generation periods and time transitions. At these times,
the operational cost of a miscalculation would be greatest.
Therefore, while there was not an imposition of a two stage
architecture as previously described, we found it to be evi-
denced — Linear Regression provided sufficient explanation
for modeling the base trends and our residual error analysis
showed us that the remaining problem was smaller and more
localized and thus better suited for targeted sequence learn-
ing.
E. ATTENTION-BASED BILSTM RESIDUAL LEARNER
The residual learner receives a 48-hour lookback sequence
with 10 input channels. A bidirectional LSTM layer extracts
temporal features from both forward and backward direc-
tions. The bidirectional structure is motivated by the obser-
vation that renewable generation is influenced not only by
the most recent hours but also by where the current hour
lies within the surrounding diurnal pattern: a bidirectional
encoder can inspect both the local lead-in and the lagged tail
of the window during representation building. The attention
scoring function first computes a saliency score for each
hidden state:
ei = tanh(W ahi +b a),(5)
which is then normalized via softmax to produce attention
weights and an attention-weighted context vector:
αi = exp(ei)PL
j=1 exp(ej)
,c=
LX
i=1
αihi,(6)
whereh i is the hidden state andcis the attention-weighted
context. The context vector is projected to the residual esti-
mate through a dense projection:
ˆεt =W o ·φ(W cct +b c) +b o,(7)
whereφdenotes ReLU activation. Attention is included be-
cause not every hour in the lookback window contributes
equally to the residual: peak-generation errors are often
driven by the interaction between immediate short-horizon
fluctuations and periodic diurnal recurrence. The mean at-
tention profile observed in development concentrated most
strongly on the most recent one to two hours while also as-
signing informative weight near the daily recurrence bound-
ary (approximately 24 hours prior). This profile (the network
that emphasizes the most current data with the least depen-
dency on approximate daily recurrence) illustrates the physi-
cal nature of the residual learning issue; sudden changes in the
weather occur within the last few hours while the structural
influence of predictable daily solar influences remains. There
are three advantages to this additive form: the terms have an
interpretable function, therefore they preserve interpretabil-
ity; it makes optimization easier as it converts the deep part
of the network from predicting targets to correcting errors;
and it prevents degradation since if the residual component
6

--- Page 7 ---

TABLE 3.Attention-Based BiLSTM Residual Learner Architecture
Layer Output Shape Parameters
Input(48,10)0
Bidirectional
LSTM
(48,32)3,456
Attention layer(32)80
Dropout(32)0
Dense(16)528
Output dense(1)17
Total–4,081
predicts nearly nothing, then the model will revert back to its
previously validated linear base. The results are transformed
inversely to their original scale to be evaluated.
F. MODEL ARCHITECTURE
Table 3 reports the exact architecture obtained from the note-
book. The model has 4,081 trainable parameters, making it
substantially lighter than typical Transformer-based alterna-
tives.
G. BILSTM SELECTION RATIONALE
While Transformer-based architectures offer powerful se-
quence modeling capabilities through self-attention mecha-
nisms, they typically require larger datasets and higher com-
putational resources. The present dataset has 8,760 hourly
observations and 6,084 training sequences after lookback
construction. For this scale, a 4,081-parameter attention-
BiLSTM is more efficient and easier to deploy near the
edge than a full Transformer. The proposed attention-based
BiLSTM shares conceptual similarity with Transformer at-
tention in its ability to emphasize salient temporal features;
however, it retains a recurrent structure that is more suitable
for moderate-sized datasets. In preliminary experimentation,
GRU models were notably unstable and underperformed sub-
stantially, while plain LSTM models were more competitive
but insufficient when trained end-to-end on the full target.
This makes the proposed model computationally efficient
while still capturing important temporal dependencies rele-
vant to renewable energy forecasting.
H. RESIDUAL LEARNING JUSTIFICATION
The choice of residual decomposition over full-signal learn-
ing rests on three complementary arguments. First, there
is astatisticalargument: the Tamil Nadu generation signal
at hourly, state-level aggregation is dominated by a near-
deterministic diurnal and seasonal skeleton. Fitting a non-
linear model to this signal in full forces it to allocate most
of its capacity to re-discovering structure that a linear model
already captures with high fidelity. The residual, by contrast,
has near-zero mean and substantially lower variance, making
the nonlinear learning problem more tractable and conver-
gence more stable.
There is also anoperationalreason why we do not need
to worry about violation of the no-degradation prior. That
is, if either the additive noise branch or the attention- BiL-
STMs learn a nearly zero residual, then the resulting com-
posite model will behave like the linear model used as a
baseline rather than diverge away from the linear model.
This provides a safe operating condition since forecasting
errors in scheduling applications can lead to trading errors
or unnecessary storage cycling. In short, having a model that
cannot perform worse than the linear model provides a "safety
net" which the single deep model did not provide. There
is also anarchitecturalreason for this decision based on
our developmental history. EA-BiLSTM v1, v2, and ACHF
were all trained end-to-end on the full normalized target
despite increasing architectural complexity — from basic
bidirectional with attention to using energy weighting for
gating and finally cross-horizon fusion. Unfortunately none
of these models outperformed Linear Regression in terms of
global error measures. Our analysis of their failures revealed
at least two possible sources: (1) the task is essentially a
linear transformation so that there is little to no nonlinear
signal that the recurrent models can exploit; (2) the size of the
training data set (6,084 sequences) was small compared to the
number of parameters needed to represent fully-signal deep
architectures. By decomposing into a linearizable portion
and then training the residual portion using a significantly
reduced sparse target, we simultaneously addressed both of
these issues.
V. EXPERIMENTAL SETUP
A. DATA SPLIT AND SEQUENCE CONSTRUCTION
The hourly dataset is split into train, validation, and test
partitions with chronological order preserved. The raw split
sizes are 6,132 training observations, 1,314 validation ob-
servations, and 1,314 test observations. After applying a 48-
hour lookback, the sequence tensors contain 6,084 training
sequences, 1,266 validation sequences, and 1,266 test se-
quences. The test interval spans November 9, 2019 06:00
through December 31, 2019 23:00. Continuous exogenous
features are standardized using StandardScaler fit on the
training partition only, then applied to validation and test
partitions to avoid leakage.
B. BASELINES
Two baseline models are used. Linear Regression is trained on
flattened 48-hour sequence windows and represents the de-
terministic reference model. Random Forest is trained on the
same flattened representation with 200 trees, maximum depth
12, and minimum leaf size 2, and represents a nonlinear non-
sequential baseline. The proposed residual decomposition-
based model uses the Linear Regression prediction as the
deterministic component and the attention-BiLSTM output as
the residual correction.
7

--- Page 8 ---

TABLE 4.Training Configuration and Quantitative Justification
Parameter Value Quantitative Justification
Lookback window 48 h Captures two full diurnal
cycles; longer windows yield
no test-set gain
BiLSTM units 16 per dir. 4,081 parameters total;
sufficient for residual
complexity
Dropout rate 0.2 Reduces overfitting without
degrading validation loss
Batch size 32 Balances gradient noise and
memory for 6,084 training
sequences
Initial LR10 −3 Adam default; reduced by
factor 0.5 on plateau (patience
5)
Min. learning rate10 −6 Floor that prevents excessive
reduction
Early-stop patience 15 epochs Best weights restored; model
converges at epoch 39
Loss function MSE Standard for continuous
regression targets
Optimizer Adam Adaptive moment estimation
for stable convergence
V alidation metric MAE Robust to outlier residuals;
non-squared error
Normalization StandardScaler Fit on train only; prevents
leakage to val/test sets
Max epochs 200 Sufficient ceiling; early
stopping triggers before limit
Best val. loss4.23×10 −5 Achieved at epoch 39 with
best-weights restore
On-chain PGS gate 7,000/10,000 Solidity-compatible integer
threshold for scheduling
eligibility
C. TRAINING CONFIGURATION
The BiLSTM is trained with mean-squared error loss and
MAE monitoring. Early stopping with restored best weights
prevents unnecessary training once validation loss stops im-
proving [64]. Dropout regularization and adaptive optimiza-
tion are used to stabilize training [63], [65]. A reduce-on-
plateau schedule with factor 0.5, patience 5, and minimum
learning rate10 −6 decreases the learning rate when validation
loss stagnates. The implementation uses scikit-learn for clas-
sical baselines and TensorFlow/Keras for the neural residual
learner [62], [66], [67]. The model converges in 39 epochs,
with best validation loss4.2252×10 −5 and best validation
MAE 0.005439.
Table 4 summarizes the key training hyperparameters to-
gether with their quantitative justification.
From a computational perspective, the proposed residual
framework remains lightweight. The attention-based BiL-
STM branch contains only 4,081 trainable parameters and
converges within 39 epochs under the given training con-
figuration. Because the residual branch handles only the
error term instead of the full target, the recurrent model
achieves optimal early stopping more rapidly, confirming the
efficiency benefit of the decomposition approach. Since the
Linear Regression component introduces negligible computa-
TABLE 5.Standalone EA-BiLSTM Iteration Results
Variant TestR 2 Test
MAE
Key Architectural
Change
EA-BiLSTM v1 0.841 0.018 Standard BiLSTM +
single-head attention;
full-signal target
EA-BiLSTM v2 0.912 0.013 Energy-weighted
attention gating added
EA-BiLSTM
ACHF
0.931 0.011 Adaptive cross-horizon
fusion layer added
Proposed (resid-
ual)
0.9881 0.005312Residual
decomposition;
BiLSTM on error only
tional overhead, the overall model is efficient and suitable for
real-time or edge deployment scenarios where both accuracy
and latency are critical.
D. STANDALONE EA-BILSTM TUNING CAMPAIGN
Prior to adopting the residual decomposition strategy, three
standalone energy-aware BiLSTM variants were systemati-
cally evaluated on the full normalized target, documenting
both configuration and measured outcomes to justify the
architectural pivot.
EA-BiLSTM v1employed a standard bidirectional LSTM
encoder with a single-head attention layer trained end-to-
end on the full log-transformed target. Despite competitive
early-training validation loss, the model failed to generalize
on the test set, achieving a testR 2 of 0.841 and a test MAE
of 0.018—substantially worse than the Linear Regression
baseline.
EA-BiLSTM v2introduced energy-weighted attention
gating, assigning higher importance scores to time steps
associated with elevated observed generation. This change
improved testR 2 to 0.912 and reduced test MAE to 0.013,
but performance remained below both Linear Regression and
Random Forest on global error metrics.
EA-BiLSTM ACHF(Adaptive Cross-Horizon Fusion)
added a learnable fusion layer that combined short-horizon
and long-horizon hidden states. Despite additional parameters
and training time, this variant achieved testR 2 of 0.931 and
MAE of 0.011—meaningfully better than v1 and v2, but still
inferior to Linear Regression on global RMSE. This con-
firmed that the task contains more linearizable structure than
standalone BiLSTM elaboration can overcome, and that the
correct architectural move was to separate the deterministic
and stochastic components rather than to refine the standalone
model further. Table 5 records the progression.
The visual progression in Fig. 2 reinforces the limitations
of the standalone architectures documented in Table 5. While
algorithmic modifications such as energy-weighted gating
(v2) and adaptive cross-horizon fusion (ACHF) indeed drive
consecutive improvements in Mean Absolute Error andR 2,
the trajectory clearly demonstrates diminishing returns. The
standalone recurrent models struggle to implicitly encode the
rigid daily and seasonal bounds of the grid schedule. By
8

--- Page 9 ---

FIGURE 2.Ablation analysis tracking the progression from early
standalone sequence models to the final proposed residual architecture.
The figure illustrates that while iterative attention enhancements (v1 to
v2) and architectural fusions (ACHF) incrementally improve testR 2 and
MAE, they quickly approach a performance ceiling due to the inherent
difficulty of learning structured diurnal signals purely through recurrency.
The leap in performance achieved by the proposed residual
decomposition confirms the theoretical motivation: isolating deterministic
signal structure fundamentally simplifies the learning task, allowing the
sequence model to focus entirely on correcting stochastic deviations.
contrast, the abrupt, discontinuous improvement achieved by
the proposed model validates the transition to a residual mod-
eling approach. By delegating the mathematically simple,
repetitive diurnal patterns to the Linear Regression baseline,
the BiLSTM architecture immediately achieves superior gen-
eralization, operating purely as a highly specialized nonlinear
corrector.
VI. RESULTS AND EVALUATION
A. GLOBAL FORECASTING PERFORMANCE
Table 6 reports validation and test metrics on the original
scale for all evaluated models, including standalone deep-
learning baselines and the proposed residual framework. Lin-
ear Regression and the residual decomposition-based model
show comparable global performance. Although the proposed
model achieves performance comparable to Linear Regres-
sion on global error metrics, its primary advantage lies in
improved error behavior in critical nonlinear regions, where
deterministic models tend to exhibit systematic deviations.
Therefore, the objective of the proposed framework is not to
outperform linear models on aggregate metrics, but to match
their performance while improving error behavior in critical
nonlinear regions that are operationally significant.
The comparison with Linear Regression should therefore
be read as one of practical parity on global metrics rather than
absolute scalar domination. The Tamil Nadu series is suffi-
ciently structured that a simple linear model already provides
a very strong global baseline. The value of the residual model
lies in preserving that global performance regime while of-
fering a principled mechanism to model nonlinear and peak-
hour behavior and to support execution-aware decomposition
for downstream control. Relative to Random Forest, the pro-
posed model reduces test RMSE by 25.3% (from 0.009822 to
0.007337) and reduces unexplained variance by 44.2%. Fig. 3
plots the error comparison and Fig. 5 shows the corresponding
R2 values. Further analysis indicates that the proposed model
reduces error variance during high-generation and peak pe-
riods, where linear models exhibit increased deviation and
heteroscedastic error patterns.
B. PREDICTION TRACKING
Predictive performance of the proposed residual decomposition-
based model and of a baseline linear regression model are
compared for each time step in Figure 4 The predictive per-
formance of the proposed model follows the general shape of
the actual generation pattern (the hourly generation pattern)
well. Deviations from the actual value mostly appear when
the transition between consecutive days occurs or during local
maximum/minimum generation. This result supports one key
assumption made within the decomposition concept; namely
that the global part of the generation can be modeled deter-
ministically (i.e., by the base case), whereas the remaining
variation, often referred to as "local" or "residual," should be
estimated based on past deviations.
C. ERROR DISTRIBUTION
Figure 6 presents the error distribution of the proposed resid-
ual decomposition-based model. Mean error is−0.000404,
and standard deviation is 0.007326. Given the concentration
of the majority of the error distribution around zero, it appears
that there is little bias in the model’s predictions. However, the
long tail of the distribution indicates that, although rare, some
operating conditions contribute significantly to the overall
error. Thus, even though individual operating conditions may
have a limited impact on the average error, these conditions
are important because they represent the operating conditions
in which forecasts will most likely fail.
D. FULL-HORIZON AND SHORT-HORIZON BEHAVIOR
Full-horizon behavior is shown in Figure 7 Short-horizon
behavior is depicted in Figure 8 While both plots provide
evidence of good tracking along the entire duration of the test
horizon, they clearly demonstrate different behaviors relative
to the frequency of occurrence of large errors. Specifically,
while there are many opportunities for large errors to occur
over a short horizon (e.g., every day), such opportunities are
less frequent over longer horizons. This suggests that while
RMSE captures some aspects of forecasting quality, it does so
somewhat unevenly. Specifically, it captures very accurately
the behavior of forecasts in terms of their ability to capture
trends and average values over time. However, it captures less
accurately the behavior of forecasts during periods when the
system exhibits large variability.
E. RESIDUAL AND HETEROSCEDASTIC ERROR ANAL YSIS
Although the proposed method performs similarly to Linear
Regression using Global Error Metrics, the biggest benefit
of this approach will be the improvement in error behavior
within critical nonlinear areas of the system (nonlinear areas
typically have systematic errors in deterministic methods). So
the goal of the proposed methodology is not to perform better
9

--- Page 10 ---

TABLE 6.Global Model Performance on the Original Scale
Model Val RMSE Val MAE ValR 2 Test RMSE Test MAE TestR 2
LSTM (standalone) – – – 0.0210 0.0148 0.8923
GRU (standalone) – – – 0.0628 0.0451 0.4817
BiLSTM (standalone) – – – 0.0256 0.0182 0.8421
XGBoost – – – 0.0199 0.0126 0.9819
Linear Regression 0.006999 0.005863 0.985226 0.007334 0.005305 0.988058
Random Forest 0.008663 0.006307 0.977370 0.009822 0.006824 0.978584
Residual decomposition-based
model
0.006958 0.005811 0.985400 0.007337 0.005312 0.988050
FIGURE 3.Test RMSE and MAE comparison on the original scale. The figure shows that Linear Regression and the proposed residual
decomposition-based model are nearly tied in global error, while Random Forest has visibly higher error. The key insight is that the dominant renewable
generation signal is strongly structured and linear at state-level aggregation, which means global scalar metrics alone are insufficient for evaluating
model quality. The conclusion is that the proposed model should be judged by its nonlinear and peak-period error behavior rather than by aggregate
RMSE alone, since that is where deterministic baselines systematically fail.
FIGURE 4.Predicted versus actual values for the proposed residual decomposition-based model over a representative test window. The figure shows
close alignment between actual and predicted trajectories across repeated daily peaks, with only minor deviations visible at steep generation transitions.
The key insight is that the residual branch preserves the baseline shape established by Linear Regression while selectively correcting local nonlinear
deviations, confirming that the two-stage decomposition is working as intended. The conclusion is that prediction reliability is maintained in operationally
meaningful windows, and the model is suitable for scheduling-relevant forecasting tasks.
than linear models on overall metrics, but to match the overall
performance of these models, while providing improvements
in error behavior in those nonlinear areas that are important
from an operational perspective.
As can be seen in Fig. 9, residuals of the linear baseline
occur at specific times (not randomly distributed), as opposed
to being uniformly distributed throughout the prediction hori-
zon. A closer examination of residual distribution shown in
Fig. 10 reveals the presence of heavy-tailed distributions, and
residual spreads increase as actual generation level increases,
which exhibits a classic sign of heteroscedastic behavior (the
amount of variation in the errors depends upon the operational
regime)(Fig.11). When generation is low, the linear baseline
follows the actual signal very closely and there is a small
10

--- Page 11 ---

FIGURE 5.R 2 comparison across models. The figure shows that Linear
Regression and the proposed residual decomposition-based model
explain nearly identical variance, while Random Forest explains less. The
key insight is that global variance is dominated by the deterministic
renewable-generation structure, which both the linear baseline and the
residual model capture effectively. The conclusion is that residual
learning should complement, not discard, the interpretable baseline, and
that the benefit of residual decomposition lies in peak-period reliability
rather than in aggregate variance metrics.
FIGURE 6.Prediction-error distribution for the proposed residual
decomposition-based model. The figure shows that the large majority of
prediction errors are tightly concentrated near zero, with a
near-symmetric bell-shaped profile and a standard deviation of 0.007326.
The key insight is that the model is not systematically biased in either
direction, confirming that the residual branch correctly centers its
correction around zero. The conclusion is that while the global error
profile is healthy, the non-negligible tail mass on both sides indicates that
peak-window and heteroscedastic error analysis remains necessary in
addition to global metrics, and that the operationally critical errors are
concentrated in a small fraction of high-generation hours.
residual. However, when generation is increased significantly,
the residual spreads out rapidly forming a characteristic fan
shape. The spread of the residuals widens dramatically with
increasing actual output during peak and high-generation pe-
riods. It was further demonstrated that during these same con-
ditions (peak/ high-gen) of high error variance; the proposed
residual model results in lessened error variance compared to
linear models.
An additional layer of interpretability is provided through
the use of an Attention Profile. The Network places strong
emphasis on the last observations made while still showing
a weak but noticeable relationship to approximately daily
recurrences — time-steps that were nearest to the 24-hour
boundaries in the 48 step look-back exhibited elevated At-
tention Weights. From a physical perspective this means that
sudden changes in forecasts are due to rapid changes in local
weather conditions captured in recent hourly data, whereas
predictable solar cycle fluctuations create a predictable daily
contribution which the model needs to include to reduce
TABLE 7.Diagnostic Comparison by Generation Tier
Model Global RMSE Peak RMSE
(yt ≥0.20)
Linear Regression 0.007334 0.01042
Random Forest 0.009822 0.01287
Proposed (residual)0.007337 0.00981
diurnal artifacts caused by residuals. Therefore, it appears that
the Model has internalized both the appropriate short term
(near-term) and long term (daily-periodic) structure inherent
to the residual learning problem.
F. DIAGNOSTIC COMPARISON BY GENERATION TIER
As indicated by the global and peak-band RMSE values
presented in Table 7, there is no substantial difference among
the three models at lower generation levels; however, the
proposed Residual Model produces larger reductions in error
than the other two models at higher generation levels, par-
ticularly the highest generation level. These are the windows
in which scheduling decisions and market commitments are
most dependent upon accurate forecasts.
G. PEAK-PERIOD RMSE AND ORACLE-FACING
PREDICTION STREAM
, there is no substantial difference among the three models
at lower generation levels; however, the proposed Residual
Model produces larger reductions in error than the other two
models at higher generation levels, particularly the highest
generation level. These are the windows in which scheduling
decisions and market commitments are most dependent upon
accurate forecasts. 8, we also report RMSE values for the
top quartile and top decile of observed surpluses. The opti-
mization of the prediction stream reduced the global RMSE
value significantly and also greatly improved the RMSE value
for the top quartile and top decile of observed surpluses.
The optimized 15-minute prediction streams are particularly
important during peak periods of renewable production, as
these are the time frames used to make or break schedules,
charge energy into storage devices and make commitments
to buy/sell power. Therefore, an export stream that works
well globally but fails at high generation tiers will provide
poor signals when it counts the most. By allocating additional
residual model capacity to address non-linear effects that
occur at high generation levels, our optimized oracle export
can avoid this issue.
H. ERROR VERSUS GENERATION
Our error versus generation analysis showed that error vari-
ability increases as actual generation increases. Although low
global RMSE values are desirable in terms of overall pre-
dictive accuracy, high generation periods are typically those
in which the most valuable renewable aware scheduling and
trading decisions are being made. If a model appears to be
producing good forecasts based on its global RMSE values,
11

--- Page 12 ---

FIGURE 7.Stage-4 predictions versus actual values across the full test horizon. The figure shows that all evaluated models follow the broad
renewable-generation trajectory, with the proposed residual decomposition-based model maintaining close agreement throughout. The key insight is that
deterministic structure controls most global variance and that all three models track the seasonal and daily envelope reasonably well. The conclusion is
that residual correction is most valuable in the localized nonlinear regions visible as short-term deviations from the envelope, and that full-horizon
aggregate plots should be supplemented by short-horizon and peak-period analyses to expose operationally meaningful differences.
FIGURE 8.Stage-4 predictions versus actual values during the first 168 test hours. The figure reveals more clearly where transition- and peak-period
deviations occur by zooming into the first week of the test horizon. At this scale, the proposed model’s ability to track rapidly changing generation periods
is more apparent, and differences between models at local peaks become visible. The key insight is that short-horizon visualization exposes operational
error patterns that full-horizon plots compress and obscure. The conclusion is that scheduling decisions should be designed around local error behavior,
not only annual aggregate metrics, because the critical windows for scheduling eligibility correspond precisely to the high-generation hours where error
divergence is most visible at this scale.
FIGURE 9.Linear Regression residuals over the first two test weeks. The figure shows that baseline errors spike at specific operating periods—particularly
near midday peaks and rapid transition hours—even when the global trajectory is well tracked. The key insight is that the nonlinear deviations are not
random noise uniformly distributed over time, but coherent, localized episodes that correspond to the same types of events the recurrent model is
designed to capture. The conclusion is that residual learning is rigorously justified because it targets precisely these concentrated, operationally
meaningful deviations rather than attempting to re-learn the entire signal from scratch.
12

--- Page 13 ---

TABLE 8.Global and Peak-Period RMSE for Oracle-Facing Prediction Streams
Prediction Stream Rows Global RMSE Global MAE Peak-Q75
RMSE
Peak-Q90
RMSE
Error Std.
Consensus export 3,360 0.001227 0.000931 0.001639 0.001766 0.001197
Optimized oracle export 3,360 0.000170 0.000115 0.000226 0.000276 0.000169
FIGURE 10.Distribution of Linear Regression residuals. The figure shows
a dense center near zero and visible tail mass, indicating that while most
observations are well represented by the deterministic baseline, a
meaningful minority produce large residuals that a linear model
systematically misses. The key insight is that the residual distribution is
not zero-centered noise; the heavy tails reflect structured nonlinear
behavior at high-generation and transitional periods. The conclusion is
that a lightweight residual learner focused on these tail events is
preferable to a high-capacity model trained on the full signal, because it
applies modeling complexity only where it is genuinely needed.
FIGURE 11.Residuals versus actual generation for the Linear Regression
baseline, illustrating heteroscedastic error behavior. The figure shows a
fan-shaped pattern in which error spread widens substantially as actual
power output increases, with extreme nonlinear points concentrated in
higher-generation regions. The key insight is that peak operating periods
are more error-prone precisely because they combine stronger nonlinear
effects, steeper ramps, and greater operational consequence. The
conclusion is that peak RMSE and error variance across generation tiers
are essential reliability measures for renewable-aware scheduling, and
that a model which reduces heteroscedastic error at high-generation
levels provides disproportionate operational benefit even if its global
RMSE improvement appears modest.
but produces large errors during high generation periods, then
the model is providing unreliable signals when they count the
most. Our proposed residual decomposition model avoids this
problem by providing a reliable deterministic base-line model
and devoting additional model capacity to capture non-linear
residual structures that exist at high generation levels.
I. ABLATION STUDY
Two ablation studies are undertaken to analyze the individual
contributions made by each of the choices made in designing
TABLE 9.Decomposition Ablation: Effect of Residual Split
Configuration Test
RMSE
Test MAE TestR 2
BiLSTM full-target 0.0256 0.0182 0.8421
LR + mean residual 0.007334 0.005305 0.988058
LR + attn-BiLSTM resid-
ual (proposed)
0.007337 0.005312 0.988050
TABLE 10.Historical Variant Ablation: EA-BiLSTM Progression
Variant Test RMSE Test MAE TestR 2
EA-BiLSTM v1 0.0210 0.0180 0.841
EA-BiLSTM v2 0.0160 0.0130 0.912
EA-BiLSTM ACHF 0.0130 0.0110 0.931
Proposed (residual)0.007337 0.005312 0.988050
this system. In order to evaluate the decomposition concept,
as shown in Table 9 evaluates the decomposition principle
by comparing the full two-stage model against variants that
omit the residual split. Removing residual decomposition and
training the BiLSTM directly on the full target (‘‘BiLSTM
full-target’’) degrades test RMSE substantially, replicating
the behavior observed in the standalone EA-BiLSTM experi-
ments. Keeping the linear baseline but replacing the BiLSTM
residual learner with a mean residual predictor (‘‘LR + mean
residual’’) confirms that the BiLSTM contributes meaningful
nonlinear correction beyond a trivial zero-residual fallback.
The full two-stage architecture achieves the best balance of
global accuracy and peak-period reliability.
Table 10 illustrates an ablation study for the historical EA-
BiLSTM version, illustrating how the progression from v1 to
ACHF to the current residual architecture was able to provide
significant improvements. As illustrated in this table, the
incremental development of BiLSTMs did not demonstrate
a monotonically increasing trend; however, the architectural
transition from BiLSTMs to residual decomposition provided
the largest increase in performance out of all versions exam-
ined.
VII. BLOCKCHAIN ORACLE AND SCHEDULING
EVALUATION
A. FORECAST PA YLOAD ANCHORING
Each forecast payload contains the timestamp, predicted re-
newable signal, observed or modeled operating variables, and
scheduling eligibility metadata. Before the payload is made
available for execution logic, a validation node serializes it
13

--- Page 14 ---

TABLE 11.System-Level Scheduling Metrics
Metric Value
Total test hours 1,266
Eligible hours 280
Blocked hours 986
Allowed hours 22.12%
Always-on renewable share 15.34%
Scheduled renewable share 25.81%
Renewable-share improve-
ment
10.47 percentage points
Relative improvement 68.26%
into a canonical JSON object using deterministic key ordering
and fixed floating-point precision to ensure that the same
logical forecast always produces the same byte string. The se-
rialized payload is stored off-chain in IPFS, and the resulting
content identifier (CID) is recorded alongside a keccak256
cryptographic hash of the payload. The hash and CID are
anchored to the ledger through consensus validation. Any
participant can independently verify that the decision was
based on the same forecast payload that was produced by
the model, using the on-chain hash as a fingerprint and the
IPFS CID to retrieve the full payload. This provides tamper-
evident forecast anchoring, decentralized validation, and a
transparent link between prediction and execution.
B. FORECAST-AWARE SCHEDULING
The prototype scheduling model utilizes a forecast threshold
of 0.15 to identify possible periods (or windows) suitable for
renewable-friendly scheduling. For the test hours included
within the notebook run, there were 280 hours out of 1266
total test hours where the window was eligible. There were
also 986 test hours that were identified as being non-suitable
for renewable friendly scheduling due to forecast uncertainty.
The always-on portion of renewables accounted for 15.34%,
while the scheduled portion of renewables utilized 25.81%.
Therefore, based on the information provided in Table 11,
the renewable usage improved by 10.47 percentage points,
or 68.26% greater, during scheduled windows compared to
always-on renewable usage. Such findings demonstrate that
even when forecasting metrics appear to cluster closely to-
gether, utilizing the forecasts to make control decisions can
result in significant operational and environmental benefits.
In a smart-grid or microgrid environment, similar gating
mechanisms may be used to control other flexible tasks (in-
cluding but not limited to electrolysis, batch industrial pro-
cesses, EV charging clusters, and data center workloads). The
main objective is to utilize digital demand to take advantage
of renewable rich windows instead of simply attempting to
predict these opportunities. By doing so, the forecast accuracy
becomes directly correlated to the amount of operational
carbon emissions reduced.
C. MECHANISM COMPARISON
Table 12 compares the proposed PGS-gated system to various
alternatives regarding their capabilities in terms of four capa-
bility areas: forecast gating, trade pre-qualification, verifiable
payload anchoring, and renewable-aware control. Always-
active or always-on systems do not meet requirements in any
area; blockchain-based only trading systems qualify trades
prior to clearing however do not include forecast gating
nor payload anchoring; forecasting-based systems produce
prediction outputs however lack on-chain enforcement. The
proposed system meets all three of the previously mentioned
capability areas therefore is the only alternative in this study
to provide a completely audited, forecast-driven execution
pipeline.
D. LEDGER-LEVEL INTERPRETATION
the blockchain layer will store (record) information about
whether an action triggered by a forecast was permissible;
which payload was used to trigger the action; and what hash it
used to anchor the decision. in decentralized energy systems,
this auditing trail is critical since taking actions based on fore-
casts could have impacts on many entities: e.g., producers,
consumers, the grid operator(s), and third party auditors need
assurance that the forecast that they relied on for their deci-
sions are the same, unchanged outputs of the model. the fore-
cast’s hash; its timestamp; and the eligibility determination
of the decision create a verifiable chain from model output
to operational outcome. a producer who publishes a trade
offer associated with a future period that has been anchored
to a forecast and a buyer who accepts that trade can each
independently confirm the forecast payload that supported the
terms of the contract through use of the hash stored on the
blockchain and the IPFS CID. if there were a disagreement
or other issue regarding the terms of the contract, then the
overlay contract would place the escrowed funds at risk, and
apply a "winner takes all" type of mechanism for resolving
the conflict. thus, predictive ai becomes the "gate keeper" for
determining when the ledger should take some kind of action,
and how to enforce the forecasting-driven decisions made via
use of the blockchain.
VIII. DISCUSSION
A. COMPARABLE GLOBAL PERFORMANCE WITH BETTER
OPERATIONAL INTERPRETATION
Linear Regression remains a near-tied global baseline be-
cause the dataset has strong deterministic structure. There are
both physical and data-centric explanations for this. Physi-
cally, Tamil Nadu renewable output at hourly aggregate scale
is shaped by repeating astronomical and seasonal patterns:
solar production follows a strong daily envelope, while ag-
gregated wind at state level is smoother than site-level gener-
ation. Data-centrically, the use of state-level aggregation and
engineered cyclical features exposes this regularity explicitly,
so that much of the forecast task reduces to a structured lag-
regression problem rather than a purely nonlinear sequence
problem.
14

--- Page 15 ---

TABLE 12.Mechanism Comparison: Capability Coverage Across System Types
System Type Forecast Gate Pre-qualification Payload Anchoring Renewable-Aware
Control
Always-on PoW / always-
active
× × × ×
Blockchain trading only×✓× ×
Forecasting-only methods✓× × ×
Proposed PGS-gated system✓ ✓ ✓ ✓
The most important mechanistic explanation is the near-
direct algebraic relation between the input features and the
target. BecauseP gen
t is explicitly included in the feature vector
and the targety t is a monotone transformation ofP gen
t /Ppeak ,
Linear Regression effectively discovers a near-direct map-
ping: the input signal and target are algebraically close, so
a linear model already solves most of the task with minimal
residual. This saturates the available signal for nonlinear
learning models operating on the full target, explaining why
standalone BiLSTM and GRU variants—even when architec-
turally elaborated—consistently failed to surpass the simple
linear model on global error metrics.
Although Linear Regression achieved comparable perfor-
mance with regard to global error metrics, it failed to accu-
rately capture localized nonlinear deviations — primarily dur-
ing peak-generation and transitional periods. Although these
deviations occur at a relatively low frequency, their relative
magnitude can disproportionately affect the decision-making
process associated with operational decisions (e.g., schedul-
ing, storage utilization, and market commitments). The Oc-
cam’s razor principle should be expressed more clearly; when
two pure forecasting models are essentially indistinguishable
in terms of their overall performance, the simpler model
is preferable as the baseline for pure forecasting due to its
shorter training time, quicker prediction speed, and improved
ease of interpretation. The proposed residual decomposition
framework addresses an operational limitation associated
with relying exclusively upon a linear baseline by retaining
the deterministic structure of the system while selectively
modeling the nonlinear residual. As such, the model can
provide both high levels of global accuracy and increased reli-
ability within critical operating areas. The contribution is not
simply additional complexity, but rather selective complexity.
The proposed residual decomposition framework addresses
the operational limitations of a purely linear baseline by pre-
serving the strong deterministic component while selectively
modeling the nonlinear residual. This allows the model to
maintain global accuracy while improving reliability in criti-
cal operating regions. The contribution is not raw complexity
but selective complexity.
B. ROOT-CAUSE ANAL YSIS OF STANDALONE BILSTM
UNDERPERFORMANCE
Table 13 describes the four principal hypotheses as to why
standalone BiLSTMs outperformed linear baselines on this
TABLE 13.Root-Cause Analysis of Standalone BiLSTM Underperformance
Issue Why It Hurts BiLSTM Confidence
Target near-
linear
Algebraic closeness
betweenP gen and target
saturates nonlinear
signal; capacity wasted
on deterministic
structure
High
No long mem-
ory needed
Diurnal structure is
periodic (∼24 h);
recurrent state beyond
2 h provides
diminishing returns
Medium-High
Attention over-
fits
With modest data,
attention weights overfit
training distribution
rather than generalizing
to unseen peaks
Medium
Modest data
size
6,084 training
sequences constrain
parameterized nonlinear
model vs. analytical
linear fit
High
task, along with their mechanistic rationales and confidence
evaluations. In addition to providing practitioners with evi-
dence that the failure was due to a structural misalignment
between the task and the model, rather than simply from in-
adequate training data or incorrectly chosen hyperparameters,
this diagnosis is also important.
C. ERROR VARIANCE REDUCTION
The residual analysis indicates that the linear baseline pro-
duced heteroscedastic errors (i.e., greater variance at higher
levels of actual generation). The peak RMSE Table further
verifies that optimizing predictions against an oracle reduces
both total error and peak-period error to a very low fraction of
what was achieved by the consensus baseline. Given that peak
renewable generation hours represent those most likely to
prompt scheduling, trading, or storage decisions, reducing the
error during such critical periods has operational implications
for maintaining the reliability of forecast-gated blockchain
execution. Therefore, the proposed framework addresses this
issue through the combination of a reliable deterministic base
model with a secondary "residual" component which provides
focused correction capacity to the areas within the model
where the linear model’s errors are greatest.
15

--- Page 16 ---

D. WHY NOT TRANSFORMERS?
Transformers are powerful, but they typically require more
data, more memory, and more computation than lightweight
recurrent alternatives [36], [38]–[41]. Standard Transformer
self-attention exhibits quadratic memory growth with se-
quence length, making memory demands prohibitive for edge
deployment at longer lookback windows. The present dataset
has 8,760 hourly observations and 6,084 training sequences
after lookback construction. For this scale, a 4,081-parameter
attention-BiLSTM is more efficient and easier to deploy near
the edge than a full Transformer; the quadratic memory scal-
ing of self-attention would impose significant overhead even
at the 48-step lookback used here. The proposed model retains
an attention mechanism for salient temporal weighting while
avoiding the computational overhead of a larger self-attention
architecture. Future work could evaluate Transformer or state-
space sequence models as alternative residual learners while
preserving the same decomposition principle.
E. INTERPRETABILITY
Residual decomposition gives a type of architectural inter-
pretability to deep models that function alone, which they are
unable to offer. It is clear who does what. Linear regression
captures the deterministic scaffolding (diurnal cycle, trend of
capacity factor and correlation with load) while the attention-
BiLSTM captures the nonlinear residuals (weather driven
variability, ramp event, peaks during peak hours). Separating
the two allows practitioners to debug by looking at the quality
of fit for both the linear portion and the residual distribu-
tion independently, and it helps build trust in downstream
executions. A practitioner will know when an oracle on a
blockchain performs a gate for a trade due to a PGS signal,
he/she/they can trace back the individual parts of the signal.
The dominant part of the signal comes from the linear por-
tion and the bounded adjustment provided by the BiLSTM
can be audited and bounded individually. Opaque end-to-end
models do not allow such accountability on a component-by-
component basis.
F. LIMITATIONS
This study has been conducted using only a single regional
case and one year’s worth of data collected hourly for re-
newable energy. The modeled loads and batteries provide an
excellent testing ground for evaluating the effectiveness of the
proposed methodology, but further research should examine
how well the pipeline performs under real-time operational
loads and storage telemetry. Evaluation of the blockchain
layer was performed using a decision layer prototype; there-
fore, if deployed on a live network would require analysis of
latency, gas cost, privacy issues and overall performance in
terms of achieving consensus. Additionally, future research
should quantify uncertainty for executing forecasts gated
through blockchain, including prediction interval estimation
and confidence score calibration to use in conjunction with
contract gating logic.
G. BROADER METHODOLOGICAL LESSON
The development trajectory of this work carries a broader
lesson for practitioners applying deep learning to struc-
tured physical data. Strong deep-learning architectures do
not automatically outperform simpler models on structured
grid data. Three progressively elaborated standalone BiL-
STM architectures—each incorporating additional attention
complexity—all failed to match a simple linear baseline. The
crucial insight was not to keep making BiLSTM larger or
attention more elaborate, but to ask what the model should
actually be learning. Once the question was reframed from
‘‘how do we improve standalone BiLSTM performance?’’ to
‘‘what signal remains after the linear model has explained
what it can?’’, the path to a high-performing architecture
became clear. This reframing is broadly applicable: before
investing in neural architecture search or capacity scaling,
practitioners should characterize how much of the target can
be explained by a strong analytical baseline.
IX. CONCLUSION
The purpose of the residual decomposition model is to im-
prove both renewable energy forecasting (and) blockchain-
anchored scheduling. The model decomposes a given series
into deterministic and stochastic components. For each com-
ponent, it uses Linear Regression as its baseline model and
an Attention-based Bi-LSTM to learn nearly zero residual
errors. The two stage design was chosen based upon em-
pirical evidence rather than conventional wisdom; all stan-
dalone Attention-based models under-performed compared
with their respective Linear Regression counterparts, and
residual error analysis indicated that nonlinear errors rep-
resented less than 1/5 of total residuals. Although the au-
thors did use Random Forest as one of their comparison
models, they found that the Residual Decomposition Model
reduced the unexplained variance by 44.2 percent, achieved
an improvement of 25.3 percent over Random Forest in terms
of RMSE, and performed better than all of the other deep
learning architectures tested (including LSTMs, GRUs, and
standalone Bi-LSTMS). Most importantly, the Residual De-
composition Model preserves the performance of Linear Re-
gression Baseline Models, and improves forecasting reliabil-
ity at both nonlinear and peak generation levels. In addition,
the Residual Decomposition Model includes a blockchain or-
acle layer that anchors forecasts through deterministic JSON
serialization, IPFS Storage, and on chain hash anchoring. The
anchor allows forecast output to be used as verifiable input
decisions for decentralized energy scheduling. As such, the
overall architecture represents reliable renewable-aware oper-
ation, transparent control, and decentralized energy systems.
Overall, the Residual Decomposition Architecture represents
a new paradigm in which machine learning forecasts are not
simply predictive or descriptive tools, but rather constitute
how digital and market systems functionally interact within
renewable constraint environments.
16

--- Page 17 ---

X. FUTURE WORK
Several directions can extend the present framework. First,
transformers and state space sequence models (S4, Mamba
etc.) could be used in place of the attention bi-lstm as the
residual learner while maintaining the same decomposition
principle to see if more expression architectures can provide
gains when limited to residual forecasting on moderate scale
energy data. Secondly, adaptive attention with weather regime
conditioning — automatically detecting whether the grid is
in a solar dominant, wind dominant or transition regime
and modifying the priors for attention based upon that —
may improve performance during meteorological edge cases
which drive the largest residual values. Thirdly, real time
deployment using rolling retraining will validate whether this
pipeline can remain accurate as the Tamil Nadu grid mix
evolves by incorporating streaming observations from renew-
able sources to update both the linear and residual compo-
nents incrementally. Fourthly, additional physical modeling
combining demand telemtry and energy price signals instead
of simulated load and SoC will allow full end to end validation
of all error sources in a production environment. Fifthly,
uncertainty quantification for forecast-gated blockchain ex-
ecution — including prediction intervals and calibrated con-
fidence scores into the PGS computation and smart contract
gating logic — will allows the oracle to distinguish high con-
fidence from low confidence scheduling windows reducing
over reliance on point forecasts in volatile operating regimes.
DECLARATIONS
Funding:The authors declare that no external funding was
received for this work.
Conflicts of Interest:The authors declare no conflicts of
interest.
Data A vailability:The raw renewable resource data are
available from the GridPath India dataset on Dryad [57].
Processed project artifacts used for this manuscript are
maintained in the project workspace underdatasetsand
data_processed.
Ethical Approval:This study uses publicly available
energy-system data and does not involve human participants
or animal subjects.
Author Contributions:Abhishek Kumar, Ankit Subedi,
and Liz Alex contributed to data preprocessing, model exper-
imentation, system evaluation, and manuscript preparation.
Deepika J supervised the work, reviewed the methodology,
and served as corresponding author.
ACKNOWLEDGMENT
The authors thank the School of Computer Science and Engi-
neering, VIT University, V ellore, for providing the academic
infrastructure and research environment that supported this
work.
REFERENCES
[1] B. Kroposkiet al., ‘‘Achieving a 100% renewable grid: Operating electric
power systems with extremely high levels of variable renewable energy,’’
IEEE Power and Energy Magazine, vol. 15, no. 2, pp. 61–73, Mar./Apr.
2017.
[2] P . Pinson, ‘‘Wind energy: Forecasting challenges for its operational man-
agement,’’Statistical Science, vol. 28, no. 4, pp. 564–585, 2013.
[3] C. V oyant, G. Notton, S. Kalogirou, M.-L. Nivet, C. Paoli, F. Motte, and
A. Fouilloy, ‘‘Machine learning methods for solar radiation forecasting: A
review,’’Renewable Energy, vol. 105, pp. 569–582, 2017.
[4] P . Denholm, M. O’Connell, G. Brinkman, and J. Jorgenson, ‘‘Overgener-
ation from solar energy in California: A field guide to the duck chart,’’
National Renewable Energy Laboratory, Golden, CO, USA, Tech. Rep.
NREL/TP-6A20-65023, 2015.
[5] H. Lund, P . A. Ostergaard, D. Connolly, and B. V . Mathiesen, ‘‘Smart
energy and smart energy systems,’’Energy, vol. 137, pp. 556–565, 2017.
[6] T. Hong and S. Fan, ‘‘Probabilistic electric load forecasting: A tutorial
review,’’International Journal of F orecasting, vol. 32, no. 3, pp. 914–938,
2016.
[7] R. H. Inman, H. T. C. Pedro, and C. F. M. Coimbra, ‘‘Solar forecasting
methods for renewable energy integration,’’Progress in Energy and Com-
bustion Science, vol. 39, no. 6, pp. 535–576, 2013.
[8] J. Antonanzaset al., ‘‘Review of photovoltaic power forecasting,’’Solar
Energy, vol. 136, pp. 78–111, 2016.
[9] M. Diagne, M. David, P . Lauret, J. Boland, and N. Schmutz, ‘‘Review
of solar irradiance forecasting methods and a proposition for small-scale
insular grids,’’Renewable and Sustainable Energy Reviews, vol. 27, pp.
65–76, 2013.
[10] S. Sobri, S. Koohi-Kamali, and N. A. Rahim, ‘‘Solar photovoltaic genera-
tion forecasting methods: A review,’’Energy Conversion and Management,
vol. 156, pp. 459–497, 2018.
[11] A. M. Foley, P . G. Leahy, A. Marvuglia, and E. J. McKeogh, ‘‘Current
methods and advances in forecasting of wind power generation,’’Renew-
able Energy, vol. 37, no. 1, pp. 1–8, 2012.
[12] H. Hahn, S. Meyer-Nieberg, and S. Pickl, ‘‘Electric load forecasting
methods: Tools for decision making,’’European Journal of Operational
Research, vol. 199, no. 3, pp. 902–907, 2009.
[13] G. E. P . Box, G. M. Jenkins, G. C. Reinsel, and G. M. Ljung,Time Series
Analysis: F orecasting and Control, 5th ed. Hoboken, NJ, USA: Wiley,
2015.
[14] R. J. Hyndman and G. Athanasopoulos,F orecasting: Principles and Prac-
tice, 3rd ed. Melbourne, Australia: OTexts, 2021.
[15] R. B. Cleveland, W. S. Cleveland, J. E. McRae, and I. Terpenning, ‘‘STL:
A seasonal-trend decomposition procedure based on loess,’’Journal of
Official Statistics, vol. 6, no. 1, pp. 3–73, 1990.
[16] N. E. Huanget al., ‘‘The empirical mode decomposition and the Hilbert
spectrum for nonlinear and non-stationary time series analysis,’’Proceed-
ings of the Royal Society A, vol. 454, no. 1971, pp. 903–995, 1998.
[17] Z. Wu and N. E. Huang, ‘‘Ensemble empirical mode decomposition: A
noise-assisted data analysis method,’’Advances in Adaptive Data Analysis,
vol. 1, no. 1, pp. 1–41, 2009.
[18] T. Ahmad and H. Chen, ‘‘A review on machine learning forecasting growth
trends and their real-time applications in different energy systems,’’Sus-
tainable Cities and Society, vol. 54, 2020, Art. no. 102010.
[19] A. Mellit and S. A. Kalogirou, ‘‘Artificial intelligence techniques for
photovoltaic applications: A review,’’Progress in Energy and Combustion
Science, vol. 34, no. 5, pp. 574–632, 2008.
[20] J. Jung and R. P . Broadwater, ‘‘Current status and future advances for
wind speed and power forecasting,’’Renewable and Sustainable Energy
Reviews, vol. 31, pp. 762–777, 2014.
[21] L. Breiman, ‘‘Random forests,’’Machine Learning, vol. 45, no. 1, pp. 5–32,
2001.
[22] P . Geurts, D. Ernst, and L. Wehenkel, ‘‘Extremely randomized trees,’’
Machine Learning, vol. 63, no. 1, pp. 3–42, 2006.
[23] J. H. Friedman, ‘‘Greedy function approximation: A gradient boosting
machine,’’The Annals of Statistics, vol. 29, no. 5, pp. 1189–1232, 2001.
[24] T. Chen and C. Guestrin, ‘‘XGBoost: A scalable tree boosting system,’’
inProc. 22nd ACM SIGKDD Int. Conf. Knowledge Discovery and Data
Mining, 2016, pp. 785–794.
[25] G. Keet al., ‘‘LightGBM: A highly efficient gradient boosting decision
tree,’’ inProc. Advances in Neural Information Processing Systems, 2017,
pp. 3146–3154.
[26] S. Hochreiter and J. Schmidhuber, ‘‘Long short-term memory,’’Neural
Computation, vol. 9, no. 8, pp. 1735–1780, 1997.
[27] K. Choet al., ‘‘Learning phrase representations using RNN encoder-
17

--- Page 18 ---

decoder for statistical machine translation,’’ inProc. Conf. Empirical Meth-
ods in Natural Language Processing, 2014, pp. 1724–1734.
[28] I. Sutskever, O. Vinyals, and Q. V . Le, ‘‘Sequence to sequence learning with
neural networks,’’ inProc. Advances in Neural Information Processing
Systems, 2014, pp. 3104–3112.
[29] D. Salinas, V . Flunkert, J. Gasthaus, and T. Januschowski, ‘‘DeepAR: Prob-
abilistic forecasting with autoregressive recurrent networks,’’International
Journal of F orecasting, vol. 36, no. 3, pp. 1181–1191, 2020.
[30] M. Schuster and K. K. Paliwal, ‘‘Bidirectional recurrent neural networks,’’
IEEE Transactions on Signal Processing, vol. 45, no. 11, pp. 2673–2681,
Nov. 1997.
[31] K. He, X. Zhang, S. Ren, and J. Sun, ‘‘Deep residual learning for image
recognition,’’ inProc. IEEE Conf. Computer Vision and Pattern Recogni-
tion, 2016, pp. 770–778.
[32] B. N. Oreshkin, D. Carpov, N. Chapados, and Y . Bengio, ‘‘N-BEA TS:
Neural basis expansion analysis for interpretable time series forecasting,’’
inProc. Int. Conf. Learning Representations, 2020.
[33] G. Lai, W.-C. Chang, Y . Y ang, and H. Liu, ‘‘Modeling long- and short-
term temporal patterns with deep neural networks,’’ inProc. 41st Int. ACM
SIGIR Conf. Research and Development in Information Retrieval, 2018,
pp. 95–104.
[34] D. Bahdanau, K. Cho, and Y . Bengio, ‘‘Neural machine translation by
jointly learning to align and translate,’’ inProc. Int. Conf. Learning Repre-
sentations, 2015.
[35] M.-T. Luong, H. Pham, and C. D. Manning, ‘‘Effective approaches to
attention-based neural machine translation,’’ inProc. Conf. Empirical
Methods in Natural Language Processing, 2015, pp. 1412–1421.
[36] A. V aswaniet al., ‘‘Attention is all you need,’’ inProc. Advances in Neural
Information Processing Systems, 2017, pp. 5998–6008.
[37] B. Lim, S. O. Arik, N. Loeff, and T. Pfister, ‘‘Temporal Fusion Transform-
ers for interpretable multi-horizon time series forecasting,’’International
Journal of F orecasting, vol. 37, no. 4, pp. 1748–1764, 2021.
[38] H. Zhou, S. Zhang, J. Peng, S. Zhang, J. Li, H. Xiong, and W. Zhang,
‘‘Informer: Beyond efficient Transformer for long sequence time-series
forecasting,’’ inProc. AAAI Conf. Artificial Intelligence, vol. 35, no. 12,
2021, pp. 11106–11115.
[39] H. Wu, J. Xu, J. Wang, and M. Long, ‘‘Autoformer: Decomposition Trans-
formers with auto-correlation for long-term series forecasting,’’ inProc.
Advances in Neural Information Processing Systems, 2021, pp. 22419–
22430.
[40] T. Zhouet al., ‘‘FEDformer: Frequency enhanced decomposed Trans-
former for long-term series forecasting,’’ inProc. Int. Conf. Machine
Learning, 2022, pp. 27268–27286.
[41] Y . Nie, N. H. Nguyen, P . Sinthong, and J. Kalagnanam, ‘‘A time series is
worth 64 words: Long-term forecasting with Transformers,’’ inProc. Int.
Conf. Learning Representations, 2023.
[42] H. Wuet al., ‘‘TimesNet: Temporal 2D-variation modeling for general time
series analysis,’’ inProc. Int. Conf. Learning Representations, 2023.
[43] M. Andoniet al., ‘‘Blockchain technology in the energy sector: A system-
atic review of challenges and opportunities,’’Renewable and Sustainable
Energy Reviews, vol. 100, pp. 143–174, 2019.
[44] E. Mengelkamp, J. Gaerttner, K. Rock, S. Kessler, L. Orsini, and C. Wein-
hardt, ‘‘Designing microgrid energy markets: A case study: The Brooklyn
Microgrid,’’Applied Energy, vol. 210, pp. 870–880, 2018.
[45] N. Z. Aitzhan and D. Svetinovic, ‘‘Security and privacy in decentralized
energy trading through multi-signatures, blockchain and anonymous mes-
saging streams,’’IEEE Transactions on Dependable and Secure Comput-
ing, vol. 15, no. 5, pp. 840–852, Sep./Oct. 2018.
[46] Z. Li, J. Kang, R. Y u, D. Y e, Q. Deng, and Y . Zhang, ‘‘Consortium
blockchain for secure energy trading in industrial Internet of Things,’’IEEE
Transactions on Industrial Informatics, vol. 14, no. 8, pp. 3690–3700, Aug.
2018.
[47] J. Kang, R. Y u, X. Huang, S. Maharjan, Y . Zhang, and E. Hossain,
‘‘Enabling localized peer-to-peer electricity trading among plug-in hybrid
electric vehicles using consortium blockchains,’’IEEE Transactions on
Industrial Informatics, vol. 13, no. 6, pp. 3154–3164, Dec. 2017.
[48] S. Noor, W. Y ang, M. Guo, K. H. van Dam, and X. Wang, ‘‘Energy demand
side management within micro-grid networks enhanced by blockchain,’’
Applied Energy, vol. 228, pp. 1385–1398, 2018.
[49] M. B. Mollahet al., ‘‘Blockchain for future smart grid: A comprehensive
survey,’’IEEE Internet of Things Journal, vol. 8, no. 1, pp. 18–43, Jan.
2021.
[50] N. Szabo, ‘‘Formalizing and securing relationships on public networks,’’
First Monday, vol. 2, no. 9, 1997.
[51] V . Buterin, ‘‘Ethereum: A next-generation smart contract and decentralized
application platform,’’ white paper, 2014.
[52] H. Al-Breiki, M. H. U. Rehman, K. Salah, and D. Svetinovic, ‘‘Trustworthy
blockchain oracles: Review, comparison, and open research challenges,’’
IEEE Access, vol. 8, pp. 85675–85685, 2020.
[53] S. Ellis, A. Juels, and S. Nazarov, ‘‘ChainLink: A decentralized oracle
network,’’ white paper, 2017.
[54] F. Zhanget al., ‘‘Town Crier: An authenticated data feed for smart con-
tracts,’’ inProc. ACM SIGSAC Conf. Computer and Communications
Security, 2016, pp. 270–282.
[55] A. Kosba, A. Miller, E. Shi, Z. Wen, and C. Papamanthou, ‘‘Hawk:
The blockchain model of cryptography and privacy-preserving smart con-
tracts,’’ inProc. IEEE Symp. Security and Privacy, 2016, pp. 839–858.
[56] M. Taghavi, J. Bentahar, H. Otrok, and K. Bakhtiyari, ‘‘A survey on
blockchain oracles,’’Computer Communications, vol. 189, pp. 31–48,
2022.
[57] GridPath India long-term (2020–2050) power system planning model data,
Dryad, doi: 10.5061/dryad.dz08kpsbm.
[58] H. Hersbachet al., ‘‘The ERA5 global reanalysis,’’Quarterly Journal of
the Royal Meteorological Society, vol. 146, no. 730, pp. 1999–2049, 2020.
[59] M. Senguptaet al., ‘‘The National Solar Radiation Data Base (NSRDB),’’
Renewable and Sustainable Energy Reviews, vol. 89, pp. 51–60, 2018.
[60] DTU Wind Energy and World Bank Group, ‘‘Global Wind Atlas 3.0,’’
2019. [Online]. Available: https://globalwindatlas.info/
[61] I. Staffell and S. Pfenninger, ‘‘Using bias-corrected reanalysis to simulate
current and future wind power output,’’Energy, vol. 114, pp. 1224–1239,
2016.
[62] F. Pedregosaet al., ‘‘Scikit-learn: Machine learning in Python,’’Journal of
Machine Learning Research, vol. 12, pp. 2825–2830, 2011.
[63] D. P . Kingma and J. Ba, ‘‘Adam: A method for stochastic optimization,’’ in
Proc. Int. Conf. Learning Representations, 2015.
[64] L. Prechelt, ‘‘Early stopping: But when?’’ inNeural Networks: Tricks of
the Trade. Berlin, Germany: Springer, 1998, pp. 55–69.
[65] N. Srivastava, G. Hinton, A. Krizhevsky, I. Sutskever, and R. Salakhutdi-
nov, ‘‘Dropout: A simple way to prevent neural networks from overfitting,’’
Journal of Machine Learning Research, vol. 15, pp. 1929–1958, 2014.
[66] M. Abadiet al., ‘‘TensorFlow: Large-scale machine learning on heteroge-
neous systems,’’ 2015. [Online]. Available: https://www.tensorflow.org/
[67] F. Cholletet al., ‘‘Keras,’’ 2015. [Online]. Available: https://keras.io/
ANKIT SUBEDIAnkit Subedi is with the De-
partment of Information Security, School of Com-
puter Science and Engineering, VIT University,
V ellore, Tamil Nadu, India. He is an aspiring ap-
plied economist with a strong interest in the in-
tersection of economics, blockchain, decentralized
finance (DeFi), and artificial intelligence/machine
learning (AI/ML). His work focuses on integrating
machine learning, blockchain systems, and econo-
metric methods to design secure, data-driven, and
economically efficient decentralized applications. His broader research inter-
ests include digital financial systems, decentralized governance, and predic-
tive modeling for economic and energy systems. ORCID: 0009-0003-0196-
3714.
DEEPIKA JDr. Deepika Jeevanandham received
the B.E. degree in Computer Science from Bannari
Amman Institute of Technology, India, in 2009, the
M.E. degree in Software Engineering (First Rank
Holder) from College of Engineering Guindy, In-
dia, in 2011, and the Ph.D. degree from Anna Uni-
versity in 2022. She is currently an Assistant Pro-
fessor at V ellore Institute of Technology, V ellore.
Her research interests include machine learning,
deep learning, and data privacy. She has published
in reputed journals, holds an h-index of 6 (Scopus), and has received the Anna
University Researcher Award (2022).18

--- Page 19 ---

ABHISHEK KUMARAbhishek Kumar is with the
Department of Information Technology, School of
Computer Science Engineering and Information
Systems, VIT University, V ellore, Tamil Nadu,
India. His research interests include machine
learning, renewable energy systems, blockchain-
enabled infrastructure, and intelligent scheduling.
LIZ ALEXLiz Alex is with the Department of
Computer Science Engineering, School of Com-
puter Science and Engineering, VIT University,
V ellore, Tamil Nadu, India. Her research in-
terests include embedded systems design, hard-
ware–software co-design, real-time systems, and
efficient data processing in resource-constrained
electronic systems, with an emphasis on system-
level optimization and integration.
19
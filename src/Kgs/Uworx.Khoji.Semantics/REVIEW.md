# Review Summary

You’ve got a compact semantic intent detector with ONNX embeddings. Main risks are runtime crashes when intents aren’t loaded, plus performance/resource issues from per-call model initialization and temp file handling.

Findings (highest severity first)

1. Possible null dereference when intents fail to load
   If Intents can’t load (missing Intents folder, no .txt files, or load never happened), intentSentences remains null and MatchesIntent will throw on .Select(...). This is an unhandled runtime crash path.
   File: IntentDetector.cs:17-18, 20-40, 51-58
2. Thread safety + race on initialization
   initialized and intentSentences are static and mutated without synchronization. Multiple threads can concurrently call LoadIntentsFrom, race on initialized, and end up with inconsistent or partially set state.
   File: IntentDetector.cs:17-39
3. Division by zero possible in mean pooling
   meanPooling divides by count without guarding for count == 0. Empty lines in intents files or empty inputs can yield zero-length sequences (depending on tokenizer behavior) and cause a DivideByZeroException or NaN.
   File: OnnxEncoder.cs:38-51
4. Excessive model instantiation per call
   MatchesIntent constructs a new OnnxEncoder for every query. OnnxEncoder loads and initializes an ONNX model and tokenizer, which is expensive and will dominate latency.
   File: IntentDetector.cs:53-58
   OnnxEncoder.cs:89-99
5. Temp file leakage / collisions
   extractResourceToTempFile always writes to Path.Combine(Path.GetTempPath(), resourceName). This can overwrite existing files, isn’t unique per process, and never cleans up. Over time this leaks large model files into temp.
   File: OnnxEncoder.cs:16-29

# Open Questions / Assumptions

1. Is Intents expected to be deployed alongside the assembly at AppDomain.CurrentDomain.BaseDirectory\Intents? If not, BaseAgent will always construct an unusable IntentDetector.
   File: Agents/BaseAgent.cs:13-17
2. Are intents files allowed to include blank lines? If yes, you’ll hit the mean pooling issue unless you filter them.

import { DeepSeekProvider } from "./deepseek-provider";
import { LLMProviderError, type LLMProvider } from "./types";

export {
  LLMProviderError,
  type LLMProvider,
  type ProviderAssessmentResult,
} from "./types";

export function getProvider(): LLMProvider {
  // `||` (not `??`) so an empty-string env var falls through to the default —
  // matches how unset vs. empty behave in Vercel/Next.js env loading.
  const providerName = process.env.LLM_PROVIDER || "deepseek";

  if (providerName === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new LLMProviderError("DEEPSEEK_API_KEY is not set");
    }
    const model = process.env.LLM_MODEL || "deepseek-chat";
    return new DeepSeekProvider({ apiKey, model });
  }

  throw new LLMProviderError(`Unknown LLM provider: ${providerName}`);
}

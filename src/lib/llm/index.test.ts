import { afterEach, describe, it, expect, vi } from "vitest";
import { getProvider, LLMProviderError } from "./index";
import { DeepSeekProvider } from "./deepseek-provider";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getProvider", () => {
  it("returns a DeepSeekProvider when LLM_PROVIDER is unset and DEEPSEEK_API_KEY is set", () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    const provider = getProvider();
    expect(provider).toBeInstanceOf(DeepSeekProvider);
  });

  it("returns a DeepSeekProvider when LLM_PROVIDER=deepseek", () => {
    vi.stubEnv("LLM_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    expect(getProvider()).toBeInstanceOf(DeepSeekProvider);
  });

  it("throws LLMProviderError when DEEPSEEK_API_KEY is unset", () => {
    vi.stubEnv("LLM_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect(() => getProvider()).toThrow(LLMProviderError);
    expect(() => getProvider()).toThrow(/DEEPSEEK_API_KEY/);
  });

  it("throws LLMProviderError for unknown provider names", () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    expect(() => getProvider()).toThrow(LLMProviderError);
    expect(() => getProvider()).toThrow(/Unknown LLM provider: anthropic/);
  });
});

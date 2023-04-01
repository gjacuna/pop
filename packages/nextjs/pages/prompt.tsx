import React, { useState } from "react";
import { GetServerSideProps } from "next";
import { Configuration, OpenAIApi } from "openai";

const APIModels = ["gpt-3.5-turbo", "gpt-4"];

export async function getPromptResponse(prompt: string, apiKey: string, model: string): Promise<any> {
  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);

  const result = await openai.createChatCompletion({
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  if (!result) throw new Error("Couldn't get a response");

  return result;
}

const APIForm: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(APIModels[0]);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("API Key:", apiKey);
    console.log("Prompt:", prompt);
    console.log("Selected Model:", selectedModel);
    const result = await getPromptResponse(prompt, apiKey, selectedModel);
    console.log(result);
  };

  return (
    <div>
      <span className="text-4xl sm:text-6xl text-black">Create a Proof of Prompt!</span>
      <div>
        <div>
          Input your OpenAI api-key, generate a prompt, and if you&#39;re happy: <strong>Create a Proof Prompt!</strong>
        </div>
        <div className="mt-2">
          We will create a log of the API call, the prompt used, and the result. This will be uploaded to IPFS and the
          hash of the file will be stored in the blockchain: FOREVER!
        </div>
      </div>
      <form onSubmit={submitForm}>
        <div>
          <label htmlFor="api_key">API Key</label>
          <input type="text" id="api_key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>
        <div>
          <label htmlFor="prompt">Prompt</label>
          <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} />
        </div>
        <div>
          <label htmlFor="model">Model</label>
          <select id="model" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
            {APIModels.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default APIForm;

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

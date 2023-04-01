import { useEffect, useRef, useState } from "react";
import { generateSquareSVG } from "./helpers/svg";
import { create } from "ipfs-http-client";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import ReactMarkdown from "react-markdown";
import Modal from "react-modal";
import { useAccount, useSignMessage } from "wagmi";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

type PromptParameters = {
  apiKey: string;
  model: string;
  history: ChatCompletionRequestMessage[];
};

const APIModels = ["gpt-3.5-turbo", "gpt-4"];

async function saveStringsToIPFS(jsonStringToStore: string): Promise<string> {
  const projectId = process.env.NEXT_PUBLIC_INFURA_PROJECT;
  const projectSecret = process.env.NEXT_PUBLIC_INFURA_SECRET;
  const auth = "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");
  const ipfs = create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
    headers: {
      authorization: auth,
    },
  });
  const ipfsHash = await ipfs.add(jsonStringToStore);
  console.log(JSON.stringify(history));
  console.log(ipfsHash);

  if (ipfsHash) {
    return ipfsHash.path;
  } else {
    throw new Error(`Failed to upload file to IPFS`);
  }
}

async function getPromptResponse(options: PromptParameters): Promise<any> {
  const { apiKey, model, history } = options;
  const configuration = new Configuration({
    apiKey,
  });
  try {
    const openai = new OpenAIApi(configuration);

    const result = await openai.createChatCompletion({
      model,
      messages: history,
    });

    if (!result) throw new Error("Couldn't get a response");

    console.log(result.data.choices[0].message);

    return result;
  } catch (e) {
    throw e;
  }
}

const TerminalChat = () => {
  const [apiKey, setApiKey] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [selectedModel, setSelectedModel] = useState(APIModels[0]);
  const [chatHistory, setChatHistory] = useState<ChatCompletionRequestMessage[]>([
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
  ]);
  const [message, setMessage] = useState<ChatCompletionRequestMessage>({
    role: "user",
    content: "",
  });
  const [sending, setSending] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const {
    data,
    isError,
    isLoading,
    signMessage,
    reset: resetSignature,
  } = useSignMessage({
    message: JSON.stringify(chatHistory),
    async onSuccess(data) {
      const svg = generateSquareSVG(data);
      console.log(JSON.stringify(chatHistory));
      const objectToStore = {
        chatSession: chatHistory,
        image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
        signature: data,
        timestamp: new Date().getTime(),
      };
      const hash = await saveStringsToIPFS(JSON.stringify(objectToStore));
      setIpfsHash(hash);
      console.log("Signed and Loaded!", hash);
    },
  });
  const { address } = useAccount();
  const { writeAsync, isLoading: contractIsLoading } = useScaffoldContractWrite({
    contractName: "PoP",
    functionName: "mint",
    args: [address, ipfsHash, data],
    value: "0.01",
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  const handleKeys = async (e: { metaKey: any; ctrlKey: any; key: string; preventDefault: () => void }) => {
    // bail early if meta/ctrl key not pressed. Other keys can be added in the future to trigger the hotkeys
    if (!(e.metaKey || e.ctrlKey)) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      await sendAsync();
    }
  };

  const sendAsync = async () => {
    const currentHistory = [...chatHistory, message];
    setChatHistory(prevState => [...prevState, message]);
    setMessage({ role: "user", content: "" });
    setSending(true);
    try {
      const result = await getPromptResponse({ apiKey, model: selectedModel, history: currentHistory });
      setSending(false);
      setChatHistory(prevState => [
        ...prevState,
        { role: "assistant", content: result?.data?.choices[0]?.message?.content },
      ]);
      //   setChatHistory(prevState => [...prevState, { role: "assistant", content: "Responding!" }]);
    } catch (e) {
      setSending(false);
      setChatHistory(prevState => [
        ...prevState,
        { role: "system", content: "Something went horribly wrong. Call support!" },
      ]);
    }
  };

  const handleMint = async () => {
    await writeAsync();
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    if (data) resetSignature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory]);

  useEffect(() => {
    if (!apiKey) {
      setShowModal(true);
    }
  }, [apiKey]);

  return (
    <div className="flex flex-col content-center items-center lg:grid-cols-1 flex-grow">
      <div className="flex flex-col items-center max-w-5xl mx-5 sm:mx-8 2xl:mx-20">
        <div className={`mt-10 flex gap-2 ${showModal ? "" : "invisible"} max-w-2xl`}>
          <Modal isOpen={showModal} ariaHideApp={false}>
            <div className="flex flex-col items-center gap-5 bg-base-200 bg-opacity-80 z-0 p-7 rounded-2xl shadow-lg">
              <div>
                <h2>Enter Your OpenAI API Key</h2>
              </div>
              <div>
                <small>
                  You can get a free one at{" "}
                  <a href="https://openai.com/" target={"_blank"} rel="noreferrer">
                    https://openai.com/
                  </a>
                </small>
              </div>
              <div>
                <label htmlFor="model">Model:</label>
                <select
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  id="model"
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  {APIModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Your OpenAI API Key"
                />
              </div>
              <div>
                <button
                  className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                  onClick={() => setShowModal(false)}
                >
                  Save
                </button>
              </div>
            </div>
          </Modal>
        </div>
        <div className="flex bg-base-300 relative pb-10">
          <div className="flex flex-col mt-6 px-7 py-8 bg-base-200 opacity-80 rounded-2xl shadow-lg border-2 border-primary">
            <div ref={terminalRef}>
              {chatHistory.map((msg, index) => (
                <div key={index}>
                  <b>{msg.role}: </b>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  <hr></hr>
                </div>
              ))}
              {sending && <p>Thinking...</p>}
            </div>
            <hr></hr>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <textarea
                value={message.content}
                placeholder="Write your message to the assistant here..."
                onChange={e => setMessage({ role: "user", content: e.target.value })}
                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                onKeyDown={handleKeys}
              />
              <button
                className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                onClick={sendAsync}
              >
                Send (cmd+Enter)
              </button>
              <button
                className={`text-gray-900 ${
                  !data ? "" : "invisible"
                } bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700`}
                disabled={isLoading}
                onClick={() => signMessage()}
                style={{ display: `${!data ? "block" : "none"}` }}
              >
                Sign Chat History
              </button>
              <button
                disabled={isError || !data || contractIsLoading}
                className={
                  "focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                }
                onClick={() => handleMint()}
                style={{ display: `${data ? "block" : "none"}` }}
              >
                Store Forver (0.01 ETH)! {!data && "(Sign the history first)"}
              </button>
              {isError && <div>Error signing message. Try Again.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalChat;

import { useEffect, useState } from "react";
import Image from "next/image";
import { readContract } from "@wagmi/core";
import { BigNumber } from "ethers";
import type { NextPage } from "next";
import ReactMarkdown from "react-markdown";
import Modal from "react-modal";
import { useAccount, useSignMessage } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";

const PoPCollection: NextPage = () => {
  const ipfsGateway = "https://ipfs.io/ipfs/";
  const [collection, setCollection] = useState<Record<string, unknown>[]>([]);
  const [selectedChat, setSelectedChat] = useState<Record<string, unknown>>();
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const { data: balance, isLoading: balanceLoading } = useScaffoldContractRead({
    contractName: "PoP",
    functionName: "balanceOf",
    args: [address],
  });
  const { data: popContract, isLoading: isPopLoading } = useDeployedContractInfo("PoP");
  const {
    isLoading,
    signMessage,
    reset: resetSignature,
  } = useSignMessage({
    message: JSON.stringify(selectedChat?.chatSession),
    onSuccess(data) {
      if (data === (selectedChat?.signature as string)) alert("You're the original signer!");
      else alert("You're not the original signer :(");
      setSelectedChat(undefined);
    },
  });

  useEffect(() => {
    if (
      selectedChat &&
      !showModal &&
      (selectedChat?.chatSession as Record<string, unknown>[]).length > 0 &&
      (selectedChat?.signature as string) !== ""
    ) {
      signMessage();
      resetSignature();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  useEffect(() => {
    async function fetchData() {
      if (!balanceLoading && balance && !isPopLoading && popContract && address) {
        setCollection([]);
        for (let i = 0; i < balance?.toNumber(); i++) {
          const tokenId = await readContract({
            address: popContract?.address,
            abi: popContract?.abi,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigNumber.from(i)],
          });
          if (tokenId) {
            const newItem = await readContract({
              address: popContract?.address,
              abi: popContract?.abi,
              functionName: "tokenURI",
              args: [tokenId],
            });
            fetch(`${ipfsGateway}${newItem}`)
              .then(response => response.json())
              .then(jsonData => {
                // jsonData is parsed json object received from url
                setCollection(prevState => [...prevState, { tokenId: tokenId.toNumber(), ...jsonData }]);
                console.log(jsonData);
              });
          }
        }
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  return (
    <>
      <div className="flex flex-col content-center items-center lg:grid-cols-1 flex-grow">
        <div className="flex flex-col items-center max-w-5xl mx-5 sm:mx-8 2xl:mx-20">
          <div className={`mt-10 flex gap-2 ${showModal ? "" : "invisible"} max-w-2xl`}>
            <Modal isOpen={showModal} ariaHideApp={false}>
              <div className="flex flex-col items-center gap-5 bg-base-200 bg-opacity-80 z-0 p-7 rounded-2xl shadow-lg">
                <div>
                  {selectedChat && (
                    <div>
                      ID: {`${selectedChat.tokenId} `} | Date:{" "}
                      {`${new Date(selectedChat.timestamp as number).toLocaleString()} `}
                    </div>
                  )}
                </div>
                <div>
                  {selectedChat &&
                    (selectedChat.chatSession as Record<string, unknown>[]).map((msg, index) => (
                      <div key={index}>
                        <b>{msg.role as string}: </b>
                        <ReactMarkdown>{msg.content as string}</ReactMarkdown>
                        <hr></hr>
                      </div>
                    ))}
                </div>
                <div>
                  <button
                    className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedChat(undefined);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </div>
      <div className="flex flex-col mt-10 flex gap-2 content-center items-center lg:grid-cols-1 flex-grow">
        <div className="flex flex-col items-center max-w-5xl mx-5 sm:mx-8 2xl:mx-20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {!balanceLoading && balance && balance.toNumber() == 0 ? (
              <div>No Chat History</div>
            ) : (
              collection.map(item => {
                return (
                  <div key={`${item.timestamp}`}>
                    <Image
                      className="h-auto max-w-full rounded-lg"
                      src={`${item.image}`}
                      alt=""
                      width={256}
                      height={256}
                    />
                    ID: {`${item.tokenId} `} | Date: {`${new Date(item.timestamp as number).toLocaleString()} `}
                    <button
                      className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                      onClick={() => {
                        setSelectedChat(item as Record<string, unknown>);
                        setShowModal(true);
                      }}
                    >
                      Show Chat
                    </button>
                    <button
                      disabled={isLoading}
                      className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                      onClick={() => {
                        setSelectedChat(item as Record<string, unknown>);
                      }}
                    >
                      Verify Sign.
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PoPCollection;

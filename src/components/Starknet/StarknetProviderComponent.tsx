"use client";
import { sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  useInjectedConnectors,
  jsonRpcProvider,
} from "@starknet-react/core";
import { Chain } from "@starknet-react/chains";
import { RpcProviderOptions } from "starknet";

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [argent(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "random",
  });

  function rpc(chain: Chain): RpcProviderOptions | null {
    const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!alchemyApiKey) {
      return null;
    }
    return {
      nodeUrl: `https://starknet-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
    };
  }

  const provider =
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? jsonRpcProvider({ rpc }) : publicProvider();


  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={provider}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}

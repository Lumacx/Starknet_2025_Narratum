import React from "react";
import { sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  useInjectedConnectors,
} from "@starknet-react/core";

// Definimos las cadenas soportadas
const chains = [sepolia];

export function StarknetProviderComponent({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Wallets recomendadas que se mostrarán si el usuario no tiene ninguna instalada,
    // o según la lógica de `includeRecommended`.
    recommended: [
      argent(),
      braavos(),
    ],
    // 'onlyIfNoConnectors': Muestra las recomendadas solo si el usuario no tiene NINGUNA wallet instalada.
    // 'always': Siempre muestra las recomendadas además de las instaladas.
    // 'ifNoInstalledWallets': Similar a 'onlyIfNoConnectors' pero un poco diferente en la detección.
    includeRecommended: "always", 
    // Orden en que aparecen los conectores en la UI que pueda generar @starknet-react/core (si aplica)
    // StarknetKit tiene su propio orden, pero es bueno configurar esto consistentemente.
    order: "random",
  });

  return (
    <StarknetConfig
      chains={chains}
      provider={publicProvider()}
      connectors={connectors}
      autoConnect // Es útil para reconectar automáticamente a la última wallet usada.
    >
      {children}
    </StarknetConfig>
  );
} 
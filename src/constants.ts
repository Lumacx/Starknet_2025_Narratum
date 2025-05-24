import { sepolia } from "@starknet-react/chains";

export const NARRATUM_CONTRACT_ADDRESS = "0x2f318c4544d2a873d2d46e00ad0c49c0c9a20cbf0ae5d3a93b2b7d3a9df03ac";

// Ya no necesitamos definir explícitamente los conectores aquí
// si StarknetKit los maneja a través de su modal.

export const starknetChains = [sepolia]; // Solo mantenemos las cadenas por si StarknetConfig aún las quiere
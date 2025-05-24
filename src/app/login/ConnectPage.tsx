import React, { useEffect, useCallback, useState } from 'react';
import { useAccount, useConnect } from '@starknet-react/core';
import { useNavigate } from 'react-router-dom';
import { NARRATUM_CONTRACT_ADDRESS } from '../constants';
import { Call } from 'starknet';
import { connect as connectStarknetkit } from 'starknetkit';
import '../App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { faBookOpen, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faFacebookF } from '@fortawesome/free-brands-svg-icons';


function ConnectPage() {
  const { account, address, status } = useAccount();
  const { connect, connectors: starknetReactConnectors } = useConnect();
  const navigate = useNavigate();
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasAttemptedExecute, setHasAttemptedExecute] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  console.log('[ConnectPage] Render - Status:', status, 'Address:', address, 'Account:', !!account, 'isExecuting:', isExecuting, 'hasAttemptedExecute:', hasAttemptedExecute, 'isConnecting:', isConnecting);
  console.log('[ConnectPage] Render - Conectores disponibles desde useConnect:', starknetReactConnectors);

  const handleConnectStarknetKit = async () => {
    console.log('[ConnectPage] handleConnectStarknetKit - Iniciando conexión StarknetKit');
    setIsConnecting(true);
    setExecuteError(null);
    setHasAttemptedExecute(false);
    try {
      const connectionResponse = await connectStarknetkit({});
      console.log('[ConnectPage] handleConnectStarknetKit - connectStarknetkit respondió:', connectionResponse);
      if (!connectionResponse) {
         console.warn('[ConnectPage] handleConnectStarknetKit - La respuesta de connectStarknetkit fue null.');
      }
    } catch (error: any) {
      console.error("[ConnectPage] handleConnectStarknetKit - Error al invocar connectStarknetkit:", error);
      setExecuteError("Error al iniciar conexión con StarknetKit: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectBraavosDirectly = async () => {
    console.log('[ConnectPage] handleConnectBraavosDirectly - Iniciando conexión directa con Braavos via @starknet-react/core');
    setIsConnecting(true);
    setExecuteError(null);
    setHasAttemptedExecute(false);

    const braavosConnector = starknetReactConnectors.find(c => c.id.toLowerCase().includes('braavos'));
    console.log('[ConnectPage] handleConnectBraavosDirectly - Conector Braavos encontrado:', braavosConnector);

    if (braavosConnector) {
      try {
        console.log('[ConnectPage] handleConnectBraavosDirectly - Llamando a connect({ connector: braavosConnector }) de @starknet-react/core');
        await connect({ connector: braavosConnector });
        console.log('[ConnectPage] handleConnectBraavosDirectly - Llamada a connect de @starknet-react/core completada. Observar useAccount.');
      } catch (error: any) {
        console.error("[ConnectPage] handleConnectBraavosDirectly - Error al invocar connect de @starknet-react/core:", error);
        setExecuteError("Error al conectar directamente con Braavos: " + error.message);
      } finally {
        setIsConnecting(false);
      }
    } else {
      console.warn('[ConnectPage] handleConnectBraavosDirectly - Conector Braavos no encontrado en useConnect. Lista de conectores:', starknetReactConnectors);
      setExecuteError("Conector Braavos no disponible para conexión directa.");
      setIsConnecting(false);
    }
  };

  const generateNickname = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const calls: Call[] = React.useMemo(() => {
    if (!address) {
      console.log('[ConnectPage] useMemo calls - No address, retornando [].');
      return [];
    }
    const nickname = generateNickname();
    console.log(`[ConnectPage] useMemo calls - Dirección a guardar: ${address}, Nickname: ${nickname}`);
    return [
      {
        contractAddress: NARRATUM_CONTRACT_ADDRESS,
        entrypoint: 'save_wallet_data',
        calldata: [address, nickname],
      },
    ];
  }, [address]);

  const handleExecuteSaveWalletData = useCallback(async () => {
    console.log('[ConnectPage] handleExecuteSaveWalletData - Verificando condiciones. Account:', !!account, 'Calls length:', calls.length, 'isExecuting:', isExecuting, 'hasAttemptedExecute:', hasAttemptedExecute);
    if (!account || calls.length === 0 || isExecuting || hasAttemptedExecute) {
      if(hasAttemptedExecute) console.log('[ConnectPage] handleExecuteSaveWalletData - Ya se intentó ejecutar, no se reintenta ahora.');
      return;
    }
    
    console.log("[ConnectPage] handleExecuteSaveWalletData - Condiciones cumplidas, iniciando ejecución.");
    setIsExecuting(true);
    setHasAttemptedExecute(true); 
    setExecuteError(null);
    
    try {
      console.log("[ConnectPage] handleExecuteSaveWalletData - Enviando account.execute con calls:", JSON.stringify(calls));
      const tx = await account.execute(calls);
      console.log("[ConnectPage] handleExecuteSaveWalletData - Transacción enviada, esperando confirmación. Hash:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash);
      console.log("[ConnectPage] handleExecuteSaveWalletData - Transacción confirmada:", tx);
      navigate('/story');
    } catch (err: any) {
      console.error("[ConnectPage] handleExecuteSaveWalletData - Error al enviar/confirmar transacción save_wallet_data:", err);
      setExecuteError(err.message || "Error desconocido al ejecutar la transacción.");
      setHasAttemptedExecute(false); // Permitir reintento si el usuario soluciona el problema y vuelve a conectar / refresca
    } finally {
      setIsExecuting(false);
      console.log('[ConnectPage] handleExecuteSaveWalletData - Finalizado.');
    }
  }, [account, calls, navigate, isExecuting, hasAttemptedExecute]); // Agregado isExecuting y hasAttemptedExecute para asegurar que el callback se recree si cambian

  useEffect(() => {
    console.log('[ConnectPage] useEffect [status, address, account] - Status:', status, 'Address:', address, 'Account:', !!account, 'isExecuting:', isExecuting, 'hasAttemptedExecute:', hasAttemptedExecute);
    if (status === 'connected' && address && account && !isExecuting && !hasAttemptedExecute) {
      console.log('[ConnectPage] useEffect [status, address, account] - Llamando a handleExecuteSaveWalletData');
      handleExecuteSaveWalletData();
    }
  }, [status, address, account, isExecuting, hasAttemptedExecute, handleExecuteSaveWalletData]);

  useEffect(() => {
    console.log('[ConnectPage] useEffect [navigation] - Status:', status, 'Address:', address, 'isExecuting:', isExecuting, 'executeError:', executeError, 'hasAttemptedExecute:', hasAttemptedExecute);
    if (status === 'connected' && address && !isExecuting && !executeError && hasAttemptedExecute) {
      console.log('[ConnectPage] useEffect [navigation] - Condiciones para navegar a /story cumplidas. Navegando...');
      navigate('/story');
    } else {
      console.log('[ConnectPage] useEffect [navigation] - Condiciones para navegar a /story NO cumplidas.');
    }
  }, [status, address, isExecuting, executeError, hasAttemptedExecute, navigate]);

  if (status === 'connecting' || isExecuting || isConnecting) {
    return <p>Conectando y configurando cuenta...</p>;
  }

  return (
   
    <div className="login-container">
        <div className="logo">
        <FontAwesomeIcon icon={faBookOpen} className="book-icon" />

            <h1>NARRATUM</h1>
        </div>

        <form className="login-form" action="#" method="post" id="email-login-form">
            <div className="input-fields-wrapper">
                <div className="input-field">
                    <i className="fas fa-envelope icon"></i>
                    <input type="email" name="email" placeholder="Email" required />
                </div>
                <hr className="separator" />
                <div className="input-field">
                    <i className="fas fa-lock icon"></i>
                    <input type="password" name="password" placeholder="Password" required />
                </div>
            </div>
           
            <button
        onClick={handleConnectStarknetKit}
        className="login-button"
        disabled={isConnecting || status === 'connected'} 
      >
        {status === 'connected' ? 'Conectado' : 'Conectar Wallet '}
      </button>
        </form>

        

        
    </div>
    
  );
}

export default ConnectPage;
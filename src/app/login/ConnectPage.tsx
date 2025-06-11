'use client'

import React from 'react'
import { constants } from 'starknet'
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core'
import { argent, braavos } from '@starknet-react/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faGithub, faDiscord } from '@fortawesome/free-brands-svg-icons'


function ConnectPage() {
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected, chainId } = useAccount()

  const socialLinks = [
    {
      name: 'Twitter',
      url: 'https://twitter.com/Starknet',
      icon: faTwitter,
      color: '#1DA1F2',
    },
    {
      name: 'GitHub',
      url: 'https://github.com/starknet-io',
      icon: faGithub,
      color: '#333',
    },
    {
      name: 'Discord',
      url: 'https://discord.gg/starknet',
      icon: faDiscord,
      color: '#7289DA',
    },
  ]

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
      <div className="w-full max-w-md mx-auto p-8 rounded-lg shadow-lg bg-gray-800">
        <h1 className="text-4xl font-bold text-center mb-8 text-starknet-blue">
          Starknet Connect
        </h1>
        <div className="space-y-4">
          {isConnected && chainId === BigInt(constants.StarknetChainId.SN_SEPOLIA) ? (
            <div className="text-center">
              <p className="text-lg mb-4">
                You are connected with address: {address}
              </p>
              <button
                className="w-full bg-starknet-blue-dark text-white font-bold py-2 px-4 rounded-lg hover:bg-starknet-blue-light transition-colors"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <p className="text-lg text-center">
                Connect your Starknet wallet to get started.
              </p>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  className="w-full bg-starknet-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-starknet-blue-light transition-colors"
                  onClick={() => connect({ connector })}
                >
                  Connect {connector.name}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="mt-8 pt-4 border-t border-gray-700">
          <h2 className="text-xl font-semibold text-center mb-4">
            Follow us on social media
          </h2>
          <div className="flex justify-center space-x-4">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={link.icon} size="2x" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConnectPage

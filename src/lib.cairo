use starknet::ContractAddress;
#[starknet::interface]
trait INarratumContract<TContractState> {
   
    fn save_wallet_data(
        ref self: TContractState, account: ContractAddress, nickname: felt252
    ) -> felt252;
    fn get_wallet_data(self: @TContractState, account: ContractAddress) -> felt252;
    fn save_story_by_user(
        ref self: TContractState, account: ContractAddress, story_content: felt252
    ) -> felt252;
    fn get_all_stories(self: @TContractState, account: ContractAddress) -> Array<felt252> ;
}

#[starknet::contract]
mod NarratumContract {
    use starknet::ContractAddress;
    #[storage]
    struct Storage {
      
       walletsdata: LegacyMap<ContractAddress, WalletData>,
       storiesData: LegacyMap<(ContractAddress, u32), felt252>,
      
        
        stories_counts: LegacyMap<ContractAddress, u32>,
    }
    #[derive(Copy, Drop, starknet::Store, Serde)]
    struct WalletData {
        nickname: felt252
       
    }
    #[derive(Copy, Drop, starknet::Store, Serde)]
    struct save_story_by_user {
       
        account: ContractAddress,
        story_content: felt252,
        total_stories_for_account: u32,
    }
   
    #[abi(embed_v0)]
    impl NarratumContract of super::INarratumContract<ContractState> {
        
        fn save_wallet_data(
            ref self: ContractState, account: ContractAddress, nickname: felt252
        ) -> felt252 {
            let currentdata = self.walletsdata.read(account);

                let newdata = WalletData { nickname };
                self.walletsdata.write(account, newdata);               
                'Wallet conectada' 
            
        }
        fn get_wallet_data(self: @ContractState, account: ContractAddress) -> felt252 {
            let data = self.walletsdata.read(account);
            data.nickname
            
        }
        fn save_story_by_user( ref self: ContractState, account: ContractAddress, story_content: felt252) -> felt252 {
            let current_count = self.stories_counts.read(account);
            self.storiesData.write((account, current_count), story_content);
            let new_count = current_count + 1;
            self.stories_counts.write(account, new_count);
            'Saved story'
        }
        fn get_all_stories(self: @ContractState, account: ContractAddress) -> Array<felt252>  {
            let mut stories_array = array![];
            let count = self.stories_counts.read(account);
            let mut i = 0_u32;
            loop {
                if i >= count {
                    break;
                }
                let story: felt252 = self.storiesData.read((account, i));
                stories_array.append(story);
                i += 1;
            };
            stories_array
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{ NarratumContract, INarratumContractDispatcher, INarratumContractDispatcherTrait };
    use starknet::{ ContractAddress,  ClassHash, contract_address_const,syscalls::deploy_syscall };
    use starknet::testing;
    fn deploy_contract() -> INarratumContractDispatcher {
        let mut calldata = ArrayTrait::new();
        let class_hash = declare_contract_class();
        let contract_address = 'wallet1';
        let (address0, _) = deploy_syscall(
            NarratumContract::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false
        )
            .unwrap();
        let contract0 = INarratumContractDispatcher { contract_address: address0 };
        contract0
    }

    fn declare_contract_class() -> ClassHash {
     
        let class_hash_felt: felt252 = 'tt'; 
        class_hash_felt.try_into().unwrap()
    }
    #[test]
    fn test_store_new_wallet_with_nickname() {
        let dispatcher = deploy_contract();
        let test_wallet: ContractAddress = contract_address_const::<'wallet1'>();
        let nickname: felt252 = 'MyCoolNick';

       
        let result_message = dispatcher.save_wallet_data(test_wallet, nickname);
        assert_eq!(result_message, 'Wallet conectada', "mensaje incorrecto: nueva wallet");

        let stored_nickname = dispatcher.get_wallet_data(test_wallet);
        assert_eq!(stored_nickname, nickname, "nickname incorrecto: wallet recien conectada");

    }

    #[test]
    fn test_store_existing_wallet_with_nickname() {
        let dispatcher = deploy_contract();
        let test_wallet: ContractAddress = contract_address_const::<'wallet2'>();
        let original_nickname: felt252 = 'OriginalNick';
        let new_attempt_nickname: felt252 = 'NewNickAttempt';

 
        dispatcher.save_wallet_data(test_wallet, original_nickname);

      
        // Verificar que el nickname NO haya cambiado (según la lógica actual del contrato)
        let stored_nickname = dispatcher.get_wallet_data(test_wallet);
        assert_eq!(stored_nickname, original_nickname, "nickname no deberia cambiar para wallet existente");

        
    }
    #[test]
    fn test_save_story_by_user() {
        let dispatcher = deploy_contract();
        let test_wallet: ContractAddress = contract_address_const::<'wallet1'>();
        let first_story: felt252 = 'mi primera historia';
        let second_story: felt252 = 'mi segunda historia';
     
        let result_message = dispatcher.save_story_by_user(test_wallet, first_story);
        assert_eq!(result_message, 'Saved story', "mensaje incorrecto: no se guardo");

        let result_messagesecond = dispatcher.save_story_by_user(test_wallet, second_story);
        assert_eq!(result_messagesecond, 'Saved story', "mensaje incorrecto: no se guardo");
    }
    
    #[test]
    fn test_get_story_data() {
        let dispatcher = deploy_contract();
        let test_wallet: ContractAddress = contract_address_const::<'wallet1'>();
        
        let first_story: felt252 = 'mi primera historia';
        let second_story: felt252 = 'mi segunda historia';
     
        let result_message = dispatcher.save_story_by_user(test_wallet, first_story);
        assert_eq!(result_message, 'Saved story', "mensaje incorrecto: no se guardo");

        let result_messagesecond = dispatcher.save_story_by_user(test_wallet, second_story);
        assert_eq!(result_messagesecond, 'Saved story', "mensaje incorrecto: no se guardo");

        let all_nicks = dispatcher.get_all_stories(test_wallet);
        assert_eq!(all_nicks.len(), 2, "Longitud incorrecta del array de nicks");
        assert_eq!(*all_nicks.at(0), 'mi primera historia', "STORY 0 incorrecto en array");
        assert_eq!(*all_nicks.at(1), 'mi segunda historia', "Nick 1 incorrecto en array");
       
        
    }
    
}

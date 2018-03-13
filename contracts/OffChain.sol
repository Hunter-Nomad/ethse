pragma solidity ^0.4.15;

contract OffChain{
    
    address owner; // адрес владельца контракта
    
    struct borrower{ // структура заемщиков
        uint8 loopLoanOfMoney; // номер транзакции, если возврат частями
        uint loanAmount; // сумма займа
        uint loanBalance; // выплачено по займу
        uint setLoanBalance; // взнос по последней транзакции
        uint8 _status; // статус займа. 0 - заявка подана, 1 - займ выдан, 2 - займ возвращен
    }
    
    // событие по запросу займа
    event LoanOfMoney(address _address, uint loanAmount);
    
    // мапинг заемщиков
    mapping(address => borrower) borrowers; 
    
    // модификатор признака владельца контракта
    modifier isOwner {
        require(owner == msg.sender);
        _;
    }
    
    // конструктор
    function OffChain() public{
        owner = msg.sender;
    }
    
    // заявка на займ денег
    function loanOfMoney(uint _loanAmount) public{
        if(borrowers[msg.sender]._status == 2){ // если долг погашен, то можно подать новую заявку
            borrowers[msg.sender]._status = 0; // статус "заявка подана"
        }
        if(borrowers[msg.sender]._status == 1){ // если долг еще не погашен, но заявка подана на дополнительный займ заявку
            // borrowers[msg.sender].loanAmount += _loanAmount; //сумма займа
            borrowers[msg.sender]._status = 0; // статус "заявка подана"
            LoanOfMoney(msg.sender, _loanAmount);
        }
        if(borrowers[msg.sender]._status == 0){ // если долг погашен, то можно подать новую заявку
            borrowers[msg.sender].loanAmount += _loanAmount; //сумма займа
            LoanOfMoney(msg.sender, _loanAmount);
        }
    }
    
    // проверить состояние займа
    function getBalance(address addr) public returns(uint8, uint, uint, uint, string){
        address _address;
        if(owner == msg.sender){
            require(addr != address(0));
            _address = addr;
        } else {
            _address = msg.sender;
        }
        if(borrowers[_address]._status == 0){
            return (borrowers[_address].loopLoanOfMoney, borrowers[_address].loanAmount, borrowers[_address].loanBalance, borrowers[_address].setLoanBalance, "Займ не выдан, или на рассмотрении");
        }
        if(borrowers[_address]._status == 1){
            return (borrowers[_address].loopLoanOfMoney, borrowers[_address].loanAmount, borrowers[_address].loanBalance, borrowers[_address].setLoanBalance, "Займ выдан, но не погашен");
        }
        if(borrowers[_address]._status == 2){
            return (borrowers[_address].loopLoanOfMoney, borrowers[_address].loanAmount, borrowers[_address].loanBalance, borrowers[_address].setLoanBalance, "Займ погашен");
        }
    }
  
    // установление стастуса займа или погашение долга по займу
    function setBalance(address _address, uint _setLoanBalance) public isOwner{
        // проверка на превышение взноса по возврату долга
        if((borrowers[_address].loanAmount - borrowers[_address].loanBalance) < _setLoanBalance){
            _setLoanBalance = borrowers[_address].loanAmount - borrowers[_address].loanBalance;
        }
         // установка статуса погашенного долга
        if(_setLoanBalance == 0 && borrowers[_address]._status == 0){
            borrowers[_address]._status = 1; // статус "займ выдан"
        }
        // взнос по задолжности
        if(_setLoanBalance > 0){
            borrowers[_address].loanBalance += _setLoanBalance; // пополнение суммы по долгу
            borrowers[_address].setLoanBalance = _setLoanBalance; // взнос по последней транзакции
            borrowers[_address].loopLoanOfMoney += 1; // номер транзакции по долгу
            borrowers[_address]._status = 1; // статус "займ выдан"
        }
        // долг погашен
        if(borrowers[_address].loanAmount == borrowers[_address].loanBalance){
            borrowers[_address].loanAmount = 0; // обнуление суммы займа
            borrowers[_address].loanBalance = 0; // обнуление выплаты по займу
            borrowers[_address].setLoanBalance = 0; // обнуление последнего взноса
            borrowers[_address].loopLoanOfMoney = 0; // обнуление номера транзакции
            borrowers[_address]._status = 2; // статус "займ возвращен"
        }
    }
    
    // уничтожение контракта
    function kill() public isOwner {
        selfdestruct(owner);
    }
}

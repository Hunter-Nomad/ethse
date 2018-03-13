const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const OffChain = artifacts.require('./OffChain.sol');

contract('OffChain', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  const OWNER = accounts[0];
  let offChain;

  before('setup', () => {
    return OffChain.deployed()
    .then(instance => offChain = instance)
    .then(reverter.snapshot);
  });

  it('Проверка события при подаче займа', () => {
    const borrower = accounts[3];
    const value = 1000;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ    
    .then(result => {
        // console.log(result.logs[0].args);
        assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
        assert.equal(result.logs[0].args.loanAmount.c, value);
        assert.equal(result.logs[0].args._address, borrower); 
    });    
  });
  
  it('Проверка статуса при подачи займа от адреса заемщика', () => {
    const borrower = accounts[3];
    const value = 1000;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки    
    .then(result => {      
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ не выдан, или на рассмотрении');
    }); 
  });

  it('Проверка статуса при подачи займа от адреса OWNER', () => {
    const borrower = accounts[3];
    const value = 1000;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.getBalance.call(borrower, {from: OWNER})) // получить статус заявки    
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ не выдан, или на рассмотрении');
    }); 
  });

  it('Выдача займа и изменение статуса от адреса OWNER', () => {
    const borrower = accounts[3];
    const value = 1000;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.setBalance(borrower, 0, {from: OWNER})) // выдать заем и получить статус заявки    
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    }); 
  });


  it('Частичное погашение займа (выданно 1000 и немедленно погашенно 500) и изменение статуса от адреса OWNER', () => {
    const borrower = accounts[3];
    const value = 1000;
    const debt = 500;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.setBalance(borrower, debt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    }); 
  });

  it('Частичное погашение займа (выданно 1000 и спустя время погашенно 500) и изменение статуса от адреса OWNER', () => {
    const borrower = accounts[3];
    const value = 1000;
    const debt = 500;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.setBalance(borrower, 0, {from: OWNER})) // займ выдан 
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })  
    .then(() => offChain.setBalance(borrower, debt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[3].c, 500);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    }); 
  });

  it('Полное погашение частями', () => {
    const borrower = accounts[3];
    const value = 1000;
    const partDebt = 200;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.setBalance(borrower, 0, {from: OWNER})) // займ выдан 
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    }) 
    .then(() => offChain.setBalance(borrower, partDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[3].c, 200);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.setBalance(borrower, partDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[3].c, 200);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.setBalance(borrower, partDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[3].c, 200);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.setBalance(borrower, partDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[3].c, 200);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.setBalance(borrower, partDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[0].c, 0);
      assert.equal(result[1].c, 0);
      assert.equal(result[2].c, 0);
      assert.equal(result[3].c, 0);
      assert.equal(result[4], 'Займ погашен');    
    }); 
  });

  it('Превышение суммы погашение займа (выданно 1000, погашенно 1011) и изменение статуса от адреса OWNER', () => {
    const borrower = accounts[3];
    const value = 1000;
    const debt = 1011;
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ    
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.setBalance(borrower, 0, {from: OWNER})) // займ выдан 
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.setBalance(borrower, debt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[0].c, 0);
      assert.equal(result[1].c, 0);
      assert.equal(result[2].c, 0);
      assert.equal(result[3].c, 0);
      assert.equal(result[4], 'Займ погашен');    
    }); 
  });

  it('Дополнительный займ до полного погащения.', () => {
    const borrower = accounts[3];
    const value = 1000; // займ
    const addValue = 700; // дополнительный займ
    const partDebt = 500; // первое погашение
    const fullDebt = 1200; // полное погашение после дополнительного займа
    return Promise.resolve()
    .then(() => offChain.loanOfMoney(value, {from: borrower})) // подача заявки на займ    
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.setBalance(borrower, 0, {from: OWNER})) // займ выдан 
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result); // 1000 / 0/ 0
      assert.equal(result[1].c, value);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.setBalance(borrower, partDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result); // 1000 / 500 /500
      assert.equal(result[1].c, value);
      assert.equal(result[3].c, 500);
      assert.equal(result[4], 'Займ выдан, но не погашен');
    })
    .then(() => offChain.loanOfMoney(addValue, {from: borrower})) // подача заявки на займ         
    .then(result => {      
      assert.equal(result.logs[0].event, 'LoanOfMoney'); // Событие LoanOfMoney
    })
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result);
      assert.equal(result[1].c, (value + addValue));
      assert.equal(result[4], 'Займ не выдан, или на рассмотрении');    
    })
    .then(() => offChain.setBalance(borrower, fullDebt, {from: OWNER})) // частичное покашение   
    .then(() => offChain.getBalance.call(borrower, {from: borrower})) // получить статус заявки
    .then(result => {
      // console.log(result); // 1000 / 500 /500
      assert.equal(result[0].c, 0);
      assert.equal(result[1].c, 0);
      assert.equal(result[2].c, 0);
      assert.equal(result[3].c, 0);
      assert.equal(result[4], 'Займ погашен');  
    }); 
  });
});

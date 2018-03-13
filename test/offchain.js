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
    // .then(() => offChain.setBalance(borrower, 0, {from: OWNER})) // получить статус заявки    
    // .then(() => offChain.setBalance(borrower, 100, {from: OWNER})) // получить статус заявки    
    // .then(() => offChain.borrowers(borrower))
    // .then(() => offChain.setBalance(borrower, 900, {from: OWNER})) // получить статус заявки    
    // .then(() => offChain.borrowers(borrower))
    // .then(result => console.log(result[4])); 
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
/*
  it('should allow to repay', () => {
    const borrower = accounts[3];
    const value = 1000;
    return Promise.resolve()
    .then(() => debts.borrow(value, {from: borrower}))
    .then(() => debts.repay(borrower, value, {from: OWNER}))
    .then(() => debts.debts(borrower))
    .then(asserts.equal(0));
  });

  it('should fail on overflow when borrowing', () => {
    const borrower = accounts[3];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
      .then(() => debts.borrow(value, {from: borrower}))
      .then(() => asserts.throws(debts.borrow(1, {from: borrower})));
    });

  it('should emit Borrowed event on borrow', () => {
    const borrower = accounts[3];
    const value = 1000;
    return Promise.resolve()
    .then(() => debts.borrow(value, {from: borrower}))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'Borrowed');
      assert.equal(result.logs[0].args.by, borrower);
      assert.equal(result.logs[0].args.value.valueOf(), value);
    });
  });

  it('should allow to borrow', () => {
        const borrower = accounts[2];
        const value = 1000;
        return Promise.resolve()
            .then(() => debts.borrow(value, {from: borrower}))
            .then(result => {
                // console.log(result.logs[0].args);
                assert.equal(result.logs[0].args.value, value); 
                debts.debts(borrower).then(res => {
                        assert.equal(res.toNumber(), value)
                    }
                );
            })
    });

  it('should emit Repayed event on repay', () => {
        const borrower = accounts[3];
        const value = 1000;
        return Promise.resolve()
            .then(() => debts.borrow(value, {from: borrower}))
            .then(() => debts.repay(borrower, value, {from: OWNER}))
            .then(result => {
              // console.log(result);
                assert.equal(result.logs[0].event, 'Repayed');
                assert.equal(result.logs[0].args.by, borrower);
                assert.equal(result.logs[0].args.value.valueOf(), value);
            });
    });

  it('should not allow owner to borrow', () => {
        // const borrower = accounts[3];
        const value = 1000;
        return Promise.resolve()
        // .then(() => debts.borrow(value, {from: borrower}))
        .then(() => debts.borrow(value, {from: OWNER}))
        .then(result => {
              // console.log(result);                            
              // assert.equal(result.logs.length, 1)              
              assert.equal(result.logs.length, 0)
            });            
  });

  it('should not allow not owner to repay', () => {
        const borrower = accounts[3];
        const alien = accounts[2];
        const value = 1000;
        return Promise.resolve()
            .then(() => debts.borrow(value, {from: borrower}))
            .then(() => debts.repay(borrower, value, {from: alien}))
            .then((result) => {
              it('equal amount and value', function(){ 
                  getAndCompare(debts.debts, borrower, value);
                });
                assert.equal(result.logs.length, 0);
            })
    });

    async function getAndCompare(map, _address, value) {
      var amount = await map(_address);                     
      assert.equal(amount, value);      
    }

  // it('should direct you for inventing more tests');
  */
});

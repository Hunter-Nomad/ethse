const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Debts = artifacts.require('./Debts.sol');

contract('Debts', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  const OWNER = accounts[0];
  let debts;

  before('setup', () => {
    return Debts.deployed()
    .then(instance => debts = instance)
    .then(reverter.snapshot);
  });

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
              // console.log(result.logs[0]);
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
});
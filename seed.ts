import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env')});

(async() => {
    //only seed these if in testnet
    if(process.env.CHAIN_ENV === 'testnet'){
    }

    console.log('Seed ended, press CTRL / CMD + C');
    return;
})();
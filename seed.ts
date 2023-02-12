import dotenv from 'dotenv';
import path from 'path';
import { seedAdmins } from './src/Seeders';
dotenv.config({ path: path.join(__dirname, '.env')});

(async() => {
    seedAdmins();
    console.log('Seed ended, press CTRL / CMD + C');
    return;
})();
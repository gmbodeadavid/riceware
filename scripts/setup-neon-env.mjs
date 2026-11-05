import fs from 'fs';

const POOLER = 'postgresql://neondb_owner:npg_Osg6zFNm3BMK@ep-morning-lake-betgrv6i-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const DIRECT = 'postgresql://neondb_owner:npg_Osg6zFNm3BMK@ep-morning-lake-betgrv6i.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const envPath = '.env';
let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function setVar(text, key, value) {
  const line = `${key}="${value}"`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  return regex.test(text) ? text.replace(regex, line) : text + (text.endsWith('\n') ? '' : '\n') + line + '\n';
}

content = setVar(content, 'DATABASE_URL', POOLER);
content = setVar(content, 'DIRECT_URL', DIRECT);

fs.writeFileSync(envPath, content, 'utf8');
console.log('DATABASE_URL et DIRECT_URL écrits dans .env');
console.log('DATABASE_URL =', POOLER);
console.log('DIRECT_URL   =', DIRECT);

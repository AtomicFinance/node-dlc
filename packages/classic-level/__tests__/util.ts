import fs from 'fs';
import path from 'path';

export function rmdir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.lstatSync(filepath).isDirectory()) rmdir(filepath);
    else fs.unlinkSync(filepath);
  }
  fs.rmdirSync(dir);
}

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class FileService {
  async saveFile(file, directory) {
    if (!file) {
      throw new Error('No file provided');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), 'public', directory);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${uuidv4()}-${file.name}`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const relativeUrl = `/${directory}/${filename}`;
    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${relativeUrl}`;

    return {
      filename,
      filepath,
      relativeUrl,
      fullUrl
    };
  }

  async saveUploadedImage(file) {
    return await this.saveFile(file, 'uploads');
  }

  async saveGabaritoFile(file) {
    return await this.saveFile(file, 'gabaritos');
  }

  async savePerfilFile(file) {
    return await this.saveFile(file, 'perfis');
  }
}

export default new FileService();

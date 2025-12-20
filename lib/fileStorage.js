import { connectToDatabase } from './mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

/**
 * Salva uma imagem no MongoDB GridFS
 * @param {Buffer} buffer - Buffer da imagem
 * @param {string} filename - Nome do arquivo
 * @param {string} contentType - Tipo MIME (ex: 'image/jpeg')
 * @returns {Promise<string>} - ID do arquivo no GridFS
 */
export async function saveImageToMongoDB(buffer, filename, contentType = 'image/jpeg') {
    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, {
            contentType: contentType,
            metadata: {
                uploadedAt: new Date()
            }
        });

        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);

        readable
            .pipe(uploadStream)
            .on('error', (error) => {
                console.error('Erro ao salvar imagem no MongoDB:', error);
                reject(error);
            })
            .on('finish', () => {
                console.log('✅ Imagem salva no MongoDB. ID:', uploadStream.id);
                resolve(uploadStream.id.toString());
            });
    });
}

/**
 * Recupera uma imagem do MongoDB GridFS
 * @param {string} fileId - ID do arquivo no GridFS
 * @returns {Promise<{buffer: Buffer, contentType: string, filename: string}>}
 */
export async function getImageFromMongoDB(fileId) {
    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    return new Promise((resolve, reject) => {
        const chunks = [];
        const objectId = new ObjectId(fileId);

        bucket.openDownloadStream(objectId)
            .on('data', (chunk) => {
                chunks.push(chunk);
            })
            .on('error', (error) => {
                console.error('Erro ao recuperar imagem do MongoDB:', error);
                reject(error);
            })
            .on('end', () => {
                const buffer = Buffer.concat(chunks);
                const fileInfo = bucket.find({ _id: objectId }).toArray();

                fileInfo.then(files => {
                    if (files.length === 0) {
                        reject(new Error('Arquivo não encontrado'));
                        return;
                    }

                    resolve({
                        buffer: buffer,
                        contentType: files[0].contentType || 'image/jpeg',
                        filename: files[0].filename || 'image.jpg'
                    });
                }).catch(reject);
            });
    });
}

/**
 * Deleta uma imagem do MongoDB GridFS
 * @param {string} fileId - ID do arquivo no GridFS
 * @returns {Promise<boolean>}
 */
export async function deleteImageFromMongoDB(fileId) {
    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    try {
        await bucket.delete(new ObjectId(fileId));
        console.log('✅ Imagem deletada do MongoDB. ID:', fileId);
        return true;
    } catch (error) {
        console.error('Erro ao deletar imagem do MongoDB:', error);
        throw error;
    }
}

/**
 * Verifica se uma imagem existe no MongoDB GridFS
 * @param {string} fileId - ID do arquivo no GridFS
 * @returns {Promise<boolean>}
 */
export async function imageExistsInMongoDB(fileId) {
    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    try {
        const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
        return files.length > 0;
    } catch (error) {
        console.error('Erro ao verificar imagem no MongoDB:', error);
        return false;
    }
}


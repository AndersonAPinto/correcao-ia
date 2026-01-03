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

        // Readable.from é mais moderno e seguro para Buffers
        const readable = Readable.from(buffer);

        readable
            .pipe(uploadStream)
            .on('error', (error) => {
                console.error('❌ [GRIDFS] Erro ao salvar imagem no MongoDB:', error);
                reject(error);
            })
            .on('finish', () => {
                const id = uploadStream.id.toString();
                console.log('✅ [GRIDFS] Imagem salva com sucesso. ID:', id);
                resolve(id);
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

    try {
        const trimmedId = fileId.trim();
        console.log(`🔍 [GRIDFS] Buscando arquivo com ID: "${trimmedId}"`);

        let objectId;
        try {
            objectId = new ObjectId(trimmedId);
        } catch (e) {
            console.error(`❌ [GRIDFS] ID inválido: "${trimmedId}"`);
            throw new Error('ID de arquivo inválido');
        }

        // Verificar se o arquivo existe primeiro
        // Tentar tanto como ObjectId quanto como String para máxima compatibilidade
        let file = await db.collection('images.files').findOne({ _id: objectId });
        if (!file) {
            file = await db.collection('images.files').findOne({ _id: trimmedId });
        }

        if (!file) {
            console.error(`❌ [GRIDFS] Arquivo não encontrado em images.files: ${trimmedId}`);
            // Debug: listar um arquivo para ver o formato
            const anyFile = await db.collection('images.files').findOne({});
            if (anyFile) {
                console.log(`ℹ️ [GRIDFS] Formato do _id no banco: ${typeof anyFile._id} ${anyFile._id.constructor.name}`);
            }
            throw new Error('Arquivo não encontrado');
        }

        console.log(`✅ [GRIDFS] Arquivo encontrado: ${file.filename} (${file.length} bytes)`);

        return new Promise((resolve, reject) => {
            const chunks = [];
            // Usar o ID como ele está no banco (seja string ou objectid)
            const downloadStream = bucket.openDownloadStream(file._id);

            downloadStream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            downloadStream.on('error', (error) => {
                console.error('Erro ao baixar imagem do MongoDB:', error);
                reject(error);
            });

            downloadStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    buffer: buffer,
                    contentType: file.contentType || 'image/jpeg',
                    filename: file.filename || 'image.jpg'
                });
            });
        });
    } catch (error) {
        console.error('Erro ao recuperar imagem do MongoDB:', error);
        throw error;
    }
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


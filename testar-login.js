const http = require('http');

const BASE_URL = 'http://localhost:3000';

function fazerRequisicao(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: parsed
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testarLogin() {
    console.log('🧪 Teste de Verificação do Sistema SaaS\n');
    console.log('='.repeat(50));

    // Teste 1: Verificar se servidor está rodando
    console.log('\n1️⃣  Verificando se servidor está rodando...');
    try {
        const healthCheck = await fazerRequisicao('GET', '/');
        if (healthCheck.status) {
            console.log('✅ Servidor está respondendo (status:', healthCheck.status, ')');
        }
    } catch (error) {
        console.log('❌ Servidor não está respondendo:', error.message);
        console.log('⚠️  Certifique-se de que o servidor está rodando: yarn dev');
        return;
    }

    // Teste 2: Testar login com admin@admin.com
    console.log('\n2️⃣  Testando login com admin@admin.com / 12345678...');
    try {
        const loginResponse = await fazerRequisicao('POST', '/api/auth/login', {
            email: 'admin@admin.com',
            password: '12345678'
        });

        console.log('   Status:', loginResponse.status);
        console.log('   Resposta:', JSON.stringify(loginResponse.body, null, 2));

        if (loginResponse.status === 200) {
            console.log('✅ Login realizado com sucesso!');

            if (loginResponse.body.token) {
                console.log('✅ Token JWT gerado');
                const token = loginResponse.body.token;

                // Teste 3: Verificar token com /api/auth/me
                console.log('\n3️⃣  Verificando token JWT com /api/auth/me...');
                try {
                    const meResponse = await fazerRequisicao('GET', '/api/auth/me', null, token);

                    console.log('   Status:', meResponse.status);
                    console.log('   Resposta:', JSON.stringify(meResponse.body, null, 2));

                    if (meResponse.status === 200 && meResponse.body.user) {
                        console.log('✅ Token válido e dados do usuário retornados');

                        const user = meResponse.body.user;
                        console.log('\n📋 Dados do usuário:');
                        console.log('   - id:', user.id);
                        console.log('   - email:', user.email);
                        console.log('   - name:', user.name);
                        console.log('   - isAdmin:', user.isAdmin);
                        console.log('   - assinatura:', user.assinatura || 'N/A');

                        if (user.isAdmin === 1) {
                            console.log('\n✅ Usuário está marcado como admin (isAdmin: 1)');
                        } else {
                            console.log('\n⚠️  Usuário NÃO está marcado como admin (isAdmin:', user.isAdmin, ')');
                        }
                    } else {
                        console.log('❌ Erro ao verificar token');
                    }
                } catch (error) {
                    console.log('❌ Erro ao verificar token:', error.message);
                }
            } else {
                console.log('⚠️  Token não foi retornado na resposta');
            }
        } else if (loginResponse.status === 401) {
            console.log('❌ Credenciais inválidas');
            console.log('   Possíveis causas:');
            console.log('   - Usuário não existe no banco de dados');
            console.log('   - Senha incorreta');
            console.log('   - Senha não está hasheada corretamente no banco');
        } else if (loginResponse.status === 500) {
            console.log('❌ Erro interno do servidor');
            console.log('   Verifique os logs do servidor para mais detalhes');
        } else {
            console.log('❌ Erro inesperado:', loginResponse.status);
        }
    } catch (error) {
        console.log('❌ Erro ao fazer requisição de login:', error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Teste concluído');
}

testarLogin();


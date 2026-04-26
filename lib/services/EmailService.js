import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export class EmailService {
    /**
     * Envia email de verificação
     */
    async sendVerificationEmail(email, name, verificationToken) {
        if (!resend) {
            console.warn('⚠️ RESEND_API_KEY não configurada. Email não será enviado.');
            console.warn('💡 Configure a variável RESEND_API_KEY no ambiente para habilitar o envio de emails.');
            return { success: false, error: 'Email service not configured' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

        try {
            const result = await resend.emails.send({
                from: 'CorrijaPRO <contato@corrijapro.com.br>',
                to: email,
                subject: 'CorrijaPRO | Verifique seu email',
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Bem-vindo ao CorrijaPRO!</h1>
              <p>Olá ${name},</p>
              <p>Obrigado por se cadastrar. Para ativar sua conta e começar a corrigir suas provas, clique no botão abaixo para verificar seu e-mail:</p>
              <a href="${verificationUrl}" class="button">Ativar Minha Conta</a>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p>Este link expira em 24 horas e você terá 7 dias de acesso gratuito para testar a plataforma.</p>
              <div class="footer">
                <p>Se você não criou esta conta, pode ignorar este email.</p>
                <p>&copy; ${new Date().getFullYear()} CorrijaPRO. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            });

            if (result.error) {
                console.error('❌ Erro do Resend ao enviar email:', result.error);
                if (result.error.message && result.error.message.includes('domain')) {
                    console.warn('⚠️ Domínio não verificado no Resend. Email não será entregue até verificação.');
                }
                throw new Error(result.error.message || 'Erro ao enviar email');
            }

            console.log('✅ Email de verificação enviado via Resend. ID:', result.data?.id);
            return { success: true, id: result.data?.id };
        } catch (error) {
            console.error('❌ Erro ao enviar email de verificação:', error);
            throw new Error(`Falha ao enviar email de verificação: ${error.message}`);
        }
    }

    /**
     * Envia email de recuperação de senha
     */
    async sendPasswordResetEmail(email, name, resetToken) {
        if (!resend) {
            console.warn('⚠️ RESEND_API_KEY não configurada. Email não será enviado.');
            console.warn('💡 Configure a variável RESEND_API_KEY no ambiente para habilitar o envio de emails.');
            return { success: false, error: 'Email service not configured' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        try {
            const result = await resend.emails.send({
                from: 'CorrijaPRO <contato@corrijapro.com.br>',
                to: email,
                subject: 'Recuperação de Senha - CorrijaPRO',
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
              .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Recuperação de Senha</h1>
              <p>Olá ${name},</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.
              </div>
              <div class="footer">
                <p>Se você não solicitou esta recuperação, sua senha permanecerá inalterada.</p>
                <p>&copy; ${new Date().getFullYear()} CorrijaPRO. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
            });

            if (result.error) {
                console.error('❌ Erro do Resend ao enviar email:', result.error);
                // Se for erro de domínio não verificado, ainda consideramos sucesso parcial
                if (result.error.message && result.error.message.includes('domain')) {
                    console.warn('⚠️ Domínio não verificado no Resend. Email não será entregue até verificação.');
                    console.warn('💡 Verifique o domínio em: https://resend.com/domains');
                }
                throw new Error(result.error.message || 'Erro ao enviar email');
            }

            console.log('✅ Email de recuperação enviado via Resend. ID:', result.data?.id);
            return { success: true, id: result.data?.id };
        } catch (error) {
            console.error('❌ Erro ao enviar email de recuperação:', error);
            console.error('Detalhes:', {
                message: error.message,
                name: error.name
            });
            throw new Error(`Falha ao enviar email de recuperação: ${error.message}`);
        }
    }

  /**
   * Notifica o usuário que a exclusão foi iniciada e envia link de restauração.
   */
  async sendAccountDeletionEmail(email, name, restoreUrl, gracePeriodDays) {
    if (!resend) {
      console.warn('⚠️ RESEND_API_KEY não configurada. Email de exclusão não será enviado.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const result = await resend.emails.send({
        from: 'CorrijaPRO <contato@corrijapro.com.br>',
        to: email,
        subject: 'Solicitação de exclusão de conta recebida — CorrijaPRO',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .danger { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Exclusão de conta solicitada</h1>
              <p>Olá ${name},</p>
              <p>Recebemos sua solicitação para excluir sua conta no CorrijaPRO.</p>
              <div class="danger">
                <strong>O que acontece agora:</strong>
                <ul>
                  <li>Sua conta está desativada e você não poderá mais fazer login.</li>
                  <li>Seus dados pessoais serão anonimizados em <strong>${gracePeriodDays} dias</strong>.</li>
                  <li>Após a anonimização, a restauração não é possível.</li>
                </ul>
              </div>
              <p><strong>Mudou de ideia?</strong> Você tem ${gracePeriodDays} dias para restaurar sua conta:</p>
              <a href="${restoreUrl}" class="button">Restaurar Minha Conta</a>
              <p style="font-size:12px; color:#666;">O link de restauração expira em 7 dias. Após este prazo, entre em contato com o suporte.</p>
              <div class="footer">
                <p>Se você não solicitou a exclusão, entre em contato imediatamente com nosso suporte.</p>
                <p>&copy; ${new Date().getFullYear()} CorrijaPRO. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (result.error) throw new Error(result.error.message || 'Erro ao enviar email');
      console.log('✅ Email de exclusão enviado. ID:', result.data?.id);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error('❌ Erro ao enviar email de exclusão:', error.message);
      throw error;
    }
  }

  /**
   * Confirma que a conta foi restaurada com sucesso.
   */
  async sendAccountRestoredEmail(email, name) {
    if (!resend) return { success: false, error: 'Email service not configured' };

    try {
      const result = await resend.emails.send({
        from: 'CorrijaPRO <contato@corrijapro.com.br>',
        to: email,
        subject: 'Sua conta foi restaurada — CorrijaPRO',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style></head>
          <body><div class="container">
            <h1>Conta restaurada com sucesso!</h1>
            <p>Olá ${name},</p>
            <p>Sua conta no CorrijaPRO foi restaurada. Você já pode fazer login normalmente.</p>
            <p>Se você não solicitou a restauração, entre em contato com nosso suporte imediatamente.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} CorrijaPRO. Todos os direitos reservados.</p>
            </div>
          </div></body>
          </html>
        `,
      });

      if (result.error) throw new Error(result.error.message);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error('❌ Erro ao enviar email de restauração:', error.message);
      throw error;
    }
  }
}

export default new EmailService();


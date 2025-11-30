# 🎨 Guia de Personalização de Cores do Sidebar

## 📍 Onde Editar

As cores do sidebar são definidas no arquivo: **`app/globals.css`**

Procure pelas variáveis CSS que começam com `--sidebar-` nas linhas **87-95** (tema claro) e **122-130** (tema escuro).

## 🎨 Variáveis Disponíveis

### Variáveis do Sidebar:

1. **`--sidebar-background`** - Cor de fundo do sidebar
2. **`--sidebar-foreground`** - Cor do texto principal
3. **`--sidebar-primary`** - Cor do logo/ícone principal
4. **`--sidebar-primary-foreground`** - Cor do texto no logo
5. **`--sidebar-accent`** - Cor de destaque (hover, itens ativos)
6. **`--sidebar-accent-foreground`** - Cor do texto em itens destacados
7. **`--sidebar-border`** - Cor das bordas
8. **`--sidebar-ring`** - Cor do anel de foco (keyboard navigation)

## 🎨 Formato das Cores

As cores usam o formato **HSL (Hue, Saturation, Lightness)**:

```css
--sidebar-background: 222 47% 11%;
/*                    ↑   ↑   ↑
                      H   S   L */
```

- **H (Hue)**: 0-360 (matiz da cor)
- **S (Saturation)**: 0-100% (saturação)
- **L (Lightness)**: 0-100% (luminosidade)

## 🎨 Temas Pré-configurados

### 1. Tema Azul Educacional (Atual) ✅
```css
--sidebar-background: 222 47% 11%;        /* Azul escuro */
--sidebar-foreground: 210 40% 98%;         /* Texto branco */
--sidebar-primary: 217 91% 60%;           /* Azul vibrante */
--sidebar-accent: 217 33% 17%;             /* Azul médio */
```

### 2. Tema Verde/Natureza
```css
--sidebar-background: 142 76% 15%;        /* Verde escuro */
--sidebar-foreground: 0 0% 98%;           /* Texto branco */
--sidebar-primary: 142 76% 36%;          /* Verde vibrante */
--sidebar-accent: 142 33% 20%;            /* Verde médio */
```

### 3. Tema Roxo/Moderno
```css
--sidebar-background: 262 80% 15%;        /* Roxo escuro */
--sidebar-foreground: 0 0% 98%;           /* Texto branco */
--sidebar-primary: 262 80% 50%;          /* Roxo vibrante */
--sidebar-accent: 262 33% 20%;            /* Roxo médio */
```

### 4. Tema Laranja/Energia
```css
--sidebar-background: 25 95% 15%;         /* Laranja escuro */
--sidebar-foreground: 0 0% 98%;           /* Texto branco */
--sidebar-primary: 25 95% 53%;            /* Laranja vibrante */
--sidebar-accent: 25 33% 20%;             /* Laranja médio */
```

### 5. Tema Cinza/Profissional
```css
--sidebar-background: 240 5% 15%;         /* Cinza escuro */
--sidebar-foreground: 0 0% 98%;           /* Texto branco */
--sidebar-primary: 240 5% 50%;           /* Cinza médio */
--sidebar-accent: 240 5% 25%;             /* Cinza médio-escuro */
```

## 🛠️ Como Personalizar

### Passo 1: Escolha uma cor base
Use um conversor de cores online (ex: https://htmlcolors.com/hsl-to-hex) para converter sua cor favorita para HSL.

### Passo 2: Edite o arquivo `app/globals.css`
Localize as variáveis `--sidebar-*` e substitua os valores.

### Passo 3: Ajuste o contraste
- **Background escuro** → **Foreground claro** (para legibilidade)
- **Primary** deve contrastar bem com **primary-foreground**
- **Accent** deve ser visível mas não muito forte

### Passo 4: Teste
Recarregue a página e veja o resultado. Ajuste conforme necessário.

## 💡 Dicas

1. **Contraste**: Garanta que o texto seja legível (foreground vs background)
2. **Consistência**: Use tons da mesma família de cores
3. **Acessibilidade**: Evite cores muito claras ou muito escuras
4. **Tema Escuro**: Lembre-se de ajustar também as variáveis dentro de `.dark`

## 🔧 Exemplo Rápido: Tema Azul Claro

Se quiser um sidebar mais claro:

```css
/* Tema Claro */
--sidebar-background: 210 40% 96%;        /* Azul muito claro */
--sidebar-foreground: 222 47% 11%;         /* Texto escuro */
--sidebar-primary: 217 91% 60%;           /* Azul vibrante */
--sidebar-accent: 210 40% 90%;             /* Azul claro para hover */
```

## 📝 Nota

As mudanças são aplicadas automaticamente após salvar o arquivo. Se não aparecer, limpe o cache do navegador (Ctrl+Shift+R).


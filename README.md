# Vídeo Studio

Ferramenta web (client-side, sem backend) para gerar em massa vídeos únicos para TikTok e Instagram: sobrepõe uma legenda com suporte a emoji (renderizados como imagem, fiel ao estilo iPhone) em cima de cada vídeo enviado, preservando o áudio original.

Todo o processamento acontece no navegador — nenhum arquivo é enviado a um servidor.

## ✨ Funcionalidades

- Upload de múltiplos vídeos de uma vez (cada vídeo vira 1 post)
- Legenda por vídeo (uma frase por linha) ou a mesma legenda para todos
- Posição da legenda ajustável por arraste, individualmente por vídeo
- Formatos prontos: 9:16 (Reels/TikTok), 4:5 e 1:1 (Instagram)
- Fontes variadas (Inter, Poppins, Bebas Neue, Anton, Caveat, Permanent Marker etc.)
- Overlay escuro, sombra e caixa de fundo atrás do texto (opcional)
- Emoji renderizado fielmente ao estilo iPhone
- Controle de áudio: original, trilha personalizada (MP3/WAV/M4A) ou mudo, com volume ajustável
- Geração real do vídeo (gravação via `MediaRecorder`/Canvas) em `.webm`
- Download individual ou de todos de uma vez em `.zip`

## 🗂️ Estrutura do projeto

```
video-studio/
├── index.html   # marcação da página
├── style.css    # estilos
├── script.js    # lógica da aplicação (estado, preview, gravação/geração dos vídeos)
└── README.md
```

## ▶️ Como rodar localmente

É um site 100% estático — não tem build nem dependências de servidor. Basta:

```bash
# clone o repositório
git clone https://github.com/SEU_USUARIO/video-studio.git
cd video-studio

# suba um servidor estático simples (necessário por causa de APIs como MediaRecorder)
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

> Abrir o `index.html` direto pelo `file://` pode falhar em alguns navegadores por restrições de APIs de mídia — prefira servir via `http://localhost`.

## 🚀 Publicar com GitHub Pages (opcional)

1. Suba o repositório para o GitHub.
2. Vá em **Settings → Pages**.
3. Em "Branch", selecione `main` (pasta `/root`) e salve.
4. Em alguns minutos o projeto fica acessível em `https://SEU_USUARIO.github.io/video-studio/`.

## 🛠️ Tecnologias

- HTML, CSS e JavaScript puro (sem frameworks)
- [JSZip](https://stuk.github.io/jszip/) (via CDN) para empacotar os downloads em `.zip`
- Google Fonts (via CDN)
- APIs nativas do navegador: Canvas 2D, `MediaRecorder`, Web Audio API

## 📌 Observações / possíveis pontos de otimização

- A gravação é feita em tempo real (reproduzindo o vídeo por trás do overlay), então gerar N vídeos leva aproximadamente a soma da duração de todos eles.
- A saída é sempre `.webm` (não há conversão para `.mp4` no navegador).
- Compatibilidade de `MediaRecorder`/`captureStream` pode variar entre navegadores (funciona melhor em Chrome/Edge).

## 📄 Licença

Defina a licença que preferir (ex.: MIT) antes de tornar o repositório público, se aplicável.

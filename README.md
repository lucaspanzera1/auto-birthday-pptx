# auto-birthday-pptx
🎉Automatically generates personalized birthday PowerPoint slides from a predefined template using user data (name, date, photo).

## Como funciona?
* Existe um template .pptx, com uma imagem e placeholders {{NOME}}{{DATA_NASCIMENTO}}
* o index.js:
* - Lê o template direcionado.
* - Lê a "requisição" exemplo-api.json
* - Baixa a imagem do colaborador
* - Subistitui a imagem e placeholders do template
* - Gera um output com as alterções.

##### Template com placeholders
<img src="docs/template.png" alt="Template" width="1200" align="center" />

```bash
🚀 Iniciando automação do PowerPoint com Template...
🔄 Buscando dados...
📁 Lendo arquivo: /home/panzera/Área de trabalho/auto-birthday-pptx/exemplo-api.json
✅ Dados obtidos: {
  nome: 'Lucas Panzera',
  dataNascimento: '2006-11-09',
  imagemUrl: 'https://picsum.photos/400/300?random=1'
}
🔄 Modificando template...
✅ Template encontrado
🔄 Baixando imagem...
✅ Imagem baixada com sucesso
🔄 Processando 1 slide(s)...
🔄 Substituindo imagem...
✅ Template modificado com sucesso!
📁 Arquivo salvo em: output/apresentacao_Lucas_Panzera_1754354074904.pptx
🎉 Processo concluído com sucesso!
📄 Arquivo criado: output/apresentacao_Lucas_Panzera_1754354074904.pptx
```

##### Outputs com dados da requisição
<img src="docs/output.png" alt="Template" width="1200" align="center" />

<img src="docs/processo.gif" alt="Template" width="1200" align="center" />

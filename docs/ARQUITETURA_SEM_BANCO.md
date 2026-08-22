# Arquitetura sem banco de dados

O HEDGE LAB opera, nesta versão, sem persistência relacional e sem qualquer dependência funcional de tabelas de usuários. As exposições, os cenários e os cálculos existem em **DataFrames de sessão** no navegador; a continuidade entre sessões ocorre somente por exportação e importação explícitas de pacotes JSON/CSV com manifesto, hash e linhagem.

| Componente | Estado | Finalidade |
|---|---|---|
| Banco relacional do template | **Desativado** | Não recebe leitura ou escrita de dados do domínio nem de usuários. |
| Adaptador `server/db.ts` | Compatibilidade inerte | Retorna `null` e não cria cliente de banco, mesmo que exista variável de ambiente no runtime. |
| Autenticação do template | Não requerida pelo produto | A interface não redireciona para login; os módulos de hedge são públicos dentro do ambiente do projeto. |
| DataFrames de exposição e cenário | Ativos em sessão | Mantêm dados somente enquanto a sessão do navegador está aberta. |
| ZIPs oficiais coletados | Armazenamento de objetos | São preservados sob chave rastreável, com hashes e URL de origem, sem metadados relacionais. |
| Continuidade e auditoria | Exportação explícita | Pacotes JSON/CSV e relatórios PDF carregam hash, fonte, data/hora e versão de esquema. |

> Não há fallback silencioso para banco de dados. Caso uma funcionalidade futura exija persistência, ela deverá ser desenhada explicitamente para arquivos versionáveis e armazenamento de objetos, preservando as regras de linhagem e integridade já aplicadas ao pipeline de mercado.

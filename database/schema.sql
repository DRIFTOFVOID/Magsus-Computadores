CREATE DATABASE IF NOT EXISTS pegasus_computadores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pegasus_computadores;

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(15) NOT NULL,
  email VARCHAR(180) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cliente),
  INDEX idx_clientes_telefone (telefone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicos (
  id_servico INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(500) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_servico),
  UNIQUE KEY uq_servicos_codigo (codigo),
  UNIQUE KEY uq_servicos_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitacoes (
  id_solicitacao BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cliente BIGINT UNSIGNED NULL,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(15) NOT NULL,
  servico VARCHAR(40) NOT NULL,
  data_desejada DATE NULL,
  mensagem VARCHAR(2000) NOT NULL,
  equipamento ENUM('Desktop','Notebook') NOT NULL,
  preferencias JSON NULL,
  anexo_nome VARCHAR(255) NULL,
  anexo_mime VARCHAR(100) NULL,
  anexo_dados LONGBLOB NULL,
  status ENUM('recebida','em_analise','aprovada','recusada','concluida') NOT NULL DEFAULT 'recebida',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_solicitacao),
  CONSTRAINT fk_solicitacoes_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_solicitacoes_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 3),
  CONSTRAINT chk_solicitacoes_mensagem CHECK (CHAR_LENGTH(TRIM(mensagem)) >= 10),
  CONSTRAINT chk_solicitacoes_data CHECK (data_desejada IS NULL OR data_desejada >= '2020-01-01'),
  INDEX idx_solicitacoes_status_data (status, criado_em),
  INDEX idx_solicitacoes_telefone (telefone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitacao_servicos (
  id_solicitacao BIGINT UNSIGNED NOT NULL,
  id_servico INT UNSIGNED NOT NULL,
  quantidade TINYINT UNSIGNED NOT NULL DEFAULT 1,
  observacao VARCHAR(500) NULL,
  PRIMARY KEY (id_solicitacao,id_servico),
  CONSTRAINT fk_ss_solicitacao FOREIGN KEY (id_solicitacao) REFERENCES solicitacoes(id_solicitacao) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ss_servico FOREIGN KEY (id_servico) REFERENCES servicos(id_servico) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_ss_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB;

INSERT IGNORE INTO servicos (codigo,nome,descricao) VALUES
('formatacao','Formatação & Otimização','Instalação e configuração de sistema.'),
('reparo','Reparo / Diagnóstico','Análise e reparo de falhas.'),
('upgrade','Upgrade','Atualização de componentes.'),
('limpeza_termica','Limpeza Térmica','Higienização e manutenção térmica.'),
('montagem_pc','Montagem de PC','Montagem personalizada e testes.');

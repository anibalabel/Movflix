<?php
class DooplexDatabase {
    private string $host = 'localhost'; // En servidor externo usar 'mysql.us.cloudlogin.co'
    private int $port = 3306;
    private string $dbname = 'plusmovie_st';
    private string $username = 'plusmovie_st';
    private string $password = '5083038xS/@';
    private string $charset = 'utf8mb4';

    public function connect(): PDO {
        $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset={$this->charset}";
        try {
            return new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            // Fallback al host remoto si localhost no responde
            $remoteDsn = "mysql:host=mysql.us.cloudlogin.co;port={$this->port};dbname={$this->dbname};charset={$this->charset}";
            return new PDO($remoteDsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        }
    }
}


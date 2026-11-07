<?php
class DooplexDatabase {
    private string $host = '';
    private int $port = 3306;
    private string $dbname = '';
    private string $username = '';
    private string $password = '';
    private string $charset = 'utf8mb4';

    public function __construct() {
        // 1. Intentar leer desde archivo local generado por el instalador (.db-config.json)
        $jsonPath = dirname(__DIR__, 2) . '/.db-config.json';
        if (file_exists($jsonPath)) {
            $raw = file_get_contents($jsonPath);
            $cfg = json_decode($raw ?: '{}', true);
            if (is_array($cfg)) {
                $this->host = (string)($cfg['host'] ?? '');
                $this->port = (int)($cfg['port'] ?? 3306);
                $this->dbname = (string)($cfg['database'] ?? '');
                $this->username = (string)($cfg['user'] ?? '');
                $this->password = (string)($cfg['password'] ?? '');
            }
        }

        // 2. Intentar leer desde config.local.php si existe (ignorado en Git)
        $localPhp = __DIR__ . '/config.local.php';
        if (empty($this->host) && file_exists($localPhp)) {
            $cfg = include $localPhp;
            if (is_array($cfg)) {
                $this->host = (string)($cfg['host'] ?? '');
                $this->port = (int)($cfg['port'] ?? 3306);
                $this->dbname = (string)($cfg['database'] ?? '');
                $this->username = (string)($cfg['user'] ?? '');
                $this->password = (string)($cfg['password'] ?? '');
            }
        }

        // 3. Fallback a variables de entorno
        if (empty($this->host)) {
            $this->host = (string)(getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? ''));
            $this->port = (int)(getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? 3306));
            $this->dbname = (string)(getenv('DB_DATABASE') ?: ($_ENV['DB_DATABASE'] ?? ''));
            $this->username = (string)(getenv('DB_USERNAME') ?: ($_ENV['DB_USERNAME'] ?? ''));
            $this->password = (string)(getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? ''));
        }
    }

    public function connect(): PDO {
        if (empty($this->host) || empty($this->dbname) || empty($this->username)) {
            throw new RuntimeException('La base de datos no está configurada. Por favor completa la instalación en /setup.');
        }

        $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset={$this->charset}";
        return new PDO($dsn, $this->username, $this->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}

<?php
require __DIR__.'/../backend/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__.'/../backend')->load();
$name=$_ENV['DB_DATABASE']??'librivo_db';
if(!preg_match('/^[a-zA-Z0-9_]+$/',$name)) { throw new RuntimeException('Invalid database name'); }
$pdo=new PDO('mysql:host='.$_ENV['DB_HOST'].';port='.$_ENV['DB_PORT'],$_ENV['DB_USERNAME'],$_ENV['DB_PASSWORD'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$version=$pdo->query('SELECT VERSION()')->fetchColumn();
$pdo->exec('CREATE DATABASE IF NOT EXISTS `'.$name.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
echo 'Connected to MySQL '.$version.'; database '.$name.' is ready.'.PHP_EOL;

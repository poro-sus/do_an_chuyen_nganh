<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('member_code')->nullable()->unique();
            $t->string('phone', 30)->nullable();
            $t->string('avatar')->nullable();
            $t->boolean('locked')->default(false)->index();
        });
        Schema::create('authors', function (Blueprint $t) {
            $t->id();
            $t->string('name')->index();
            $t->text('bio')->nullable();
            $t->string('image')->nullable();
            $t->timestamps();
        });
        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->string('slug')->unique();
            $t->foreignId('parent_id')->nullable()->constrained('categories')->restrictOnDelete();
            $t->text('description')->nullable();
            $t->string('color')->default('#635BFF');
            $t->timestamps();
        });
        Schema::create('publishers', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->string('email')->nullable();
            $t->string('phone')->nullable();
            $t->text('address')->nullable();
            $t->timestamps();
        });
        Schema::create('shelves', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->string('location')->nullable();
            $t->timestamps();
        });
        Schema::create('books', function (Blueprint $t) {
            $t->id();
            $t->string('title')->index();
            $t->string('slug')->unique();
            $t->string('isbn', 13)->nullable()->unique();
            $t->foreignId('publisher_id')->nullable()->constrained()->restrictOnDelete();
            $t->unsignedSmallInteger('year')->nullable();
            $t->string('language', 30)->default('Tiếng Anh')->index();
            $t->unsignedInteger('pages')->nullable();
            $t->text('summary')->nullable();
            $t->longText('description')->nullable();
            $t->string('cover')->nullable();
            $t->string('source')->nullable();
            $t->json('keywords')->nullable();
            $t->unsignedBigInteger('price')->nullable();
            $t->boolean('visible')->default(true)->index();
            $t->boolean('featured')->default(false)->index();
            $t->unsignedInteger('views')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('book_authors', function (Blueprint $t) {
            $t->foreignId('book_id')->constrained()->cascadeOnDelete();
            $t->foreignId('author_id')->constrained()->restrictOnDelete();
            $t->primary(['book_id', 'author_id']);
        });
        Schema::create('book_categories', function (Blueprint $t) {
            $t->foreignId('book_id')->constrained()->cascadeOnDelete();
            $t->foreignId('category_id')->constrained()->restrictOnDelete();
            $t->primary(['book_id', 'category_id']);
        });
        Schema::create('book_copies', function (Blueprint $t) {
            $t->id();
            $t->foreignId('book_id')->constrained()->restrictOnDelete();
            $t->string('barcode')->unique();
            $t->foreignId('shelf_id')->nullable()->constrained()->restrictOnDelete();
            $t->date('acquired_at');
            $t->string('condition')->default('good');
            $t->enum('status', ['available', 'borrowed', 'held', 'maintenance', 'lost'])->default('available')->index();
            $t->text('notes')->nullable();
            $t->timestamps();
        });
        Schema::create('loans', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('book_id')->constrained()->restrictOnDelete();
            $t->foreignId('book_copy_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $t->enum('status', ['requested', 'approved', 'active', 'returned', 'rejected', 'cancelled'])->default('requested')->index();
            $t->timestamp('approved_at')->nullable();
            $t->timestamp('borrowed_at')->nullable();
            $t->timestamp('due_at')->nullable()->index();
            $t->timestamp('returned_at')->nullable();
            $t->unsignedSmallInteger('renewal_count')->default(0);
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'status']);
            $t->index(['book_copy_id', 'status']);
        });
        Schema::create('loan_renewals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('loan_id')->constrained()->restrictOnDelete();
            $t->enum('status', ['requested', 'approved', 'rejected'])->default('requested');
            $t->timestamp('previous_due_at');
            $t->timestamp('new_due_at')->nullable();
            $t->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $t->text('reason')->nullable();
            $t->timestamps();
        });
        Schema::create('reservations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('book_id')->constrained()->restrictOnDelete();
            $t->foreignId('book_copy_id')->nullable()->constrained()->restrictOnDelete();
            $t->enum('status', ['waiting', 'ready', 'fulfilled', 'cancelled', 'expired'])->default('waiting')->index();
            $t->timestamp('expires_at')->nullable()->index();
            $t->timestamps();
            $t->index(['book_id', 'status', 'created_at']);
        });
        Schema::create('fines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('loan_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->enum('type', ['overdue', 'lost', 'damage']);
            $t->unsignedBigInteger('amount');
            $t->unsignedBigInteger('paid_amount')->default(0);
            $t->unsignedBigInteger('waived_amount')->default(0);
            $t->text('reason')->nullable();
            $t->timestamps();
            $t->unique(['loan_id', 'type']);
        });
        Schema::create('fine_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('fine_id')->constrained()->restrictOnDelete();
            $t->foreignId('handled_by')->constrained('users')->restrictOnDelete();
            $t->unsignedBigInteger('amount');
            $t->enum('type', ['payment', 'waiver'])->default('payment');
            $t->string('note');
            $t->timestamps();
        });
        Schema::create('favorites', function (Blueprint $t) {
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('book_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->primary(['user_id', 'book_id']);
        });
        Schema::create('reviews', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('book_id')->constrained()->restrictOnDelete();
            $t->unsignedTinyInteger('rating');
            $t->text('comment');
            $t->timestamps();
            $t->unique(['user_id', 'book_id']);
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('type');
            $t->morphs('notifiable');
            $t->text('data');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });
        Schema::create('settings', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->text('value')->nullable();
            $t->timestamps();
        });
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('action')->index();
            $t->string('subject')->nullable();
            $t->json('data')->nullable();
            $t->string('ip', 45)->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['audit_logs', 'settings', 'notifications', 'reviews', 'favorites', 'fine_payments', 'fines', 'reservations', 'loan_renewals', 'loans', 'book_copies', 'book_categories', 'book_authors', 'books', 'shelves', 'publishers', 'categories', 'authors'] as $name) {
            Schema::dropIfExists($name);
        } Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['member_code', 'phone', 'avatar', 'locked']));
    }
};

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can($this->isMethod('POST') ? 'books.create' : 'books.update');
    }

    public function rules(): array
    {
        return $this->editorialRules() + ['title' => ['required', 'string', 'max:255'], 'isbn' => ['nullable', 'regex:/^(?:[0-9]{9}[0-9X]|[0-9]{13})$/', Rule::unique('books')->ignore($this->route('book'))], 'author_ids' => ['required', 'array', 'min:1'], 'author_ids.*' => ['integer', 'exists:authors,id'], 'category_ids' => ['required', 'array', 'min:1'], 'category_ids.*' => ['integer', 'exists:categories,id'], 'publisher_id' => ['nullable', 'exists:publishers,id'], 'year' => ['nullable', 'integer', 'between:1000,2100'], 'pages' => ['nullable', 'integer', 'between:1,100000'], 'language' => ['required', 'string', 'max:30'], 'summary' => ['nullable', 'string', 'max:2000'], 'description' => ['nullable', 'string', 'max:20000'], 'cover' => ['nullable', 'string', 'max:500', 'regex:~^(?:/storage/|/covers/|https://covers\.openlibrary\.org/|https://books\.google\.com/)~'], 'price' => ['nullable', 'integer', 'min:0', 'max:1000000000'], 'visible' => ['boolean'], 'featured' => ['boolean'], 'keywords' => ['nullable', 'array'], 'keywords.*' => ['string', 'max:60']];
    }

    private function editorialRules(): array
    {
        return [
            'editorial' => ['nullable', 'array:headline,introduction,topics,takeaways,audience,reading_guide,author_notes,edition_note,sources'],
            'editorial.headline' => ['nullable', 'string', 'max:300'],
            'editorial.introduction' => ['sometimes', 'array', 'max:10'],
            'editorial.introduction.*' => ['string', 'max:5000'],
            'editorial.topics' => ['sometimes', 'array', 'max:12'],
            'editorial.topics.*' => ['array:title,description'],
            'editorial.topics.*.title' => ['required', 'string', 'max:200'],
            'editorial.topics.*.description' => ['required', 'string', 'max:1500'],
            'editorial.takeaways' => ['sometimes', 'array', 'max:12'],
            'editorial.takeaways.*' => ['string', 'max:1000'],
            'editorial.audience' => ['sometimes', 'array', 'max:10'],
            'editorial.audience.*' => ['string', 'max:1000'],
            'editorial.reading_guide' => ['sometimes', 'array', 'max:8'],
            'editorial.reading_guide.*' => ['array:title,description'],
            'editorial.reading_guide.*.title' => ['required', 'string', 'max:200'],
            'editorial.reading_guide.*.description' => ['required', 'string', 'max:1500'],
            'editorial.author_notes' => ['sometimes', 'array', 'max:10'],
            'editorial.author_notes.*' => ['array:name,note'],
            'editorial.author_notes.*.name' => ['required', 'string', 'max:200'],
            'editorial.author_notes.*.note' => ['required', 'string', 'max:2000'],
            'editorial.edition_note' => ['nullable', 'string', 'max:2000'],
            'editorial.sources' => ['sometimes', 'array', 'max:5'],
            'editorial.sources.*' => ['array:title,url'],
            'editorial.sources.*.title' => ['required', 'string', 'max:200'],
            'editorial.sources.*.url' => ['required', 'url', 'max:1000', 'regex:~^https://~'],
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'title' => $this->title, 'slug' => $this->slug, 'isbn' => $this->isbn, 'authors' => $this->whenLoaded('authors'), 'categories' => $this->whenLoaded('categories'), 'publisher' => $this->whenLoaded('publisher'), 'year' => $this->year, 'pages' => $this->pages, 'language' => $this->language, 'summary' => $this->summary, 'description' => $this->description, 'editorial' => $this->editorial, 'review_distribution' => $this->whenHas('review_distribution'), 'cover' => $this->cover, 'source' => $this->source, 'price' => $this->price, 'visible' => $this->visible, 'featured' => $this->featured, 'keywords' => $this->keywords, 'views' => $this->views, 'copies_count' => $this->copies_count ?? 0, 'available_count' => $this->available_count ?? 0, 'loans_count' => $this->loans_count ?? 0, 'reviews_count' => $this->reviews_count ?? 0, 'rating' => $this->reviews_avg_rating === null ? null : round((float) $this->reviews_avg_rating, 1), 'reviews' => $this->whenLoaded('reviews'), 'can_review' => $this->whenHas('can_review'), 'my_loan' => $this->whenHas('my_loan'), 'my_reservation' => $this->whenHas('my_reservation'), 'shelves' => $this->whenLoaded('copies', fn () => $this->copies->pluck('shelf')->filter()->unique('id')->values()), 'copies' => $this->when($request->user()?->can('books.update') && $this->relationLoaded('copies'), fn () => $this->copies), 'created_at' => $this->created_at];
    }
}

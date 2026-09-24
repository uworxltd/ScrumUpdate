import { Author } from "./author.datamodel";

export interface Comment {
    id: string;
    author: Author;
    body: string;
    updateAuthor: Author;
    created: string;
    updated: string;
    source: string;
    target: string;
 }

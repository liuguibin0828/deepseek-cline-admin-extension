import axios from 'axios';
import * as cheerio from 'cheerio';
import { DOCUMENTATION_URL, MAX_DOCUMENT_LENGTH } from '../config/constants';

export async function fetchDocumentation(): Promise<string> {
    try {
        const response = await axios.get(DOCUMENTATION_URL);
        const $ = cheerio.load(response.data);
        const fullText = $('body').text();
        
        // If content exceeds limit, truncate with ellipsis
        if (fullText.length > MAX_DOCUMENT_LENGTH) {
            return fullText.substring(0, MAX_DOCUMENT_LENGTH - 3) + '...';
        }
        return fullText;
    } catch (error) {
        console.error('Failed to fetch documentation:', error);
        return ''; // Return empty string if failed
    }
}

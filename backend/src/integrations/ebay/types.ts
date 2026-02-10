/**
 * eBay API TypeScript Interfaces
 * Based on eBay Trading API and OAuth 2.0
 */

export interface EbayOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: 'User Access Token' | 'Application Access Token';
}

export interface EbayUserInfo {
  userId: string;
  username: string;
}

export interface EbayListingImage {
  imageUrl: string;
}

export interface EbayListingRequest {
  Item: {
    Title: string;
    Description: string;
    PrimaryCategory: {
      CategoryID: string;
    };
    StartPrice: {
      _value: number;
      currencyID: 'USD';
    };
    ConditionID: number; // eBay condition codes
    Country: 'US';
    Currency: 'USD';
    DispatchTimeMax: number; // business days
    ListingDuration: 'Days_7' | 'Days_30' | 'GTC'; // Good 'Til Cancelled
    ListingType: 'FixedPriceItem';
    PaymentMethods: 'PayPal';
    PayPalEmailAddress: string;
    PictureDetails: {
      PictureURL: string[];
    };
    PostalCode: string;
    Quantity: number;
    ReturnPolicy: {
      ReturnsAcceptedOption: 'ReturnsAccepted' | 'ReturnsNotAccepted';
      RefundOption?: 'MoneyBack';
      ReturnsWithinOption?: 'Days_30';
      ShippingCostPaidByOption?: 'Buyer';
    };
    ShippingDetails: {
      ShippingType: 'Flat';
      ShippingServiceOptions: Array<{
        ShippingService: string; // e.g., 'USPSPriority'
        ShippingServiceCost: {
          _value: number;
          currencyID: 'USD';
        };
        ShippingServicePriority: number;
      }>;
    };
    Site: 'US';
  };
}

export interface EbayListingResponse {
  ItemID: string;
  StartTime: string;
  EndTime: string;
  Fees: {
    Fee: Array<{
      Name: string;
      Fee: {
        _value: number;
        currencyID: string;
      };
    }>;
  };
}

export interface EbayError {
  ErrorCode: string;
  ShortMessage: string;
  LongMessage: string;
  SeverityCode: 'Warning' | 'Error';
}

export interface EbayApiResponse<T> {
  Ack: 'Success' | 'Warning' | 'Failure' | 'PartialFailure';
  Errors?: EbayError[];
  data?: T;
}

/**
 * eBay Condition IDs
 * https://developer.ebay.com/devzone/finding/callref/enums/conditionIdList.html
 */
export const EBAY_CONDITION_MAP: Record<string, number> = {
  'New': 1000,
  'Like New': 1500,
  'Good': 3000,
  'Fair': 4000,
  'Poor': 5000,
};

/**
 * eBay Category IDs (simplified mapping)
 * In production, use GetSuggestedCategories API for dynamic lookup
 */
export const EBAY_CATEGORY_MAP: Record<string, string> = {
  'Consumer Electronics': '293',
  'Gaming': '1249',
  'Phones & Tablets': '15032',
  'Clothing & Fashion': '11450',
  'Collectibles & Vintage': '1',
  'Books & Media': '267',
  'Small Appliances': '20710',
  'Tools & Equipment': '631',
};

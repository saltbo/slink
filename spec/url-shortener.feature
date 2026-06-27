Feature: URL shortener core workflows
  The Worker stores short links in D1, exposes RESTful link resources, and redirects active slugs.

  Scenario: Create a short link
    When a client posts a valid HTTP or HTTPS URL to "/api/links"
    Then the API returns 201
    And the response contains the slug, target URL, timestamps, and zero clicks

  Scenario: Reject invalid creation input
    When a client posts a missing or non-HTTP URL
    Then the API returns 400 with a consistent error body
    When a client posts a custom slug outside 3 to 32 alphanumeric or hyphen characters
    Then the API returns 400 with a slug validation error

  Scenario: Prevent duplicate custom slugs
    Given a link exists with slug "docs"
    When a client posts another link with slug "docs"
    Then the API returns 409
    And the existing link remains unchanged

  Scenario: List links with pagination
    Given more links exist than the requested page size
    When a client gets "/api/links?page=1&per_page=1"
    Then the API returns 200
    And the response includes one link, total count, page, and per_page

  Scenario: Read link stats
    Given a link exists
    When a client gets "/api/links/{id}/stats"
    Then the API returns 200
    And the response includes clicks and whether the link is expired

  Scenario: Missing link resources
    When a client gets an unknown link id
    Then the API returns 404
    When a client gets stats for an unknown link id
    Then the API returns 404

  Scenario: Redirect an active slug
    Given an active link exists with slug "go"
    When a visitor gets "/go"
    Then the Worker returns 302 to the target URL
    And the link click count increments asynchronously

  Scenario: Reject missing and expired redirects
    When a visitor gets an unknown slug
    Then the Worker returns 404
    Given an expired link exists with slug "old"
    When a visitor gets "/old"
    Then the Worker returns 410
    And the link click count does not increment

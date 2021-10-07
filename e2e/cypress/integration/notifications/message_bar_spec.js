// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Group: @notifications

import * as MESSAGES from '../../fixtures/messages';
import * as TIMEOUTS from '../../fixtures/timeouts';

describe('Notifications', () => {
    let testTeam;
    let testChannel;
    let otherUser;
    let townChannelId;

    beforeEach(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            otherUser = user;

            cy.makeClient().then(async (client) => {
                const townChannel = await client.getChannelByName(testTeam.id, 'town-square');
                townChannelId = townChannel.id;
            });

            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
    });

    it('MM-T565 New message bar - Doesnt display for emoji reaction', () => {
        // # Make a starting post from the user 1
        cy.postMessage(MESSAGES.SMALL);

        // # Make a few posts from user 2 so that center can be scrolled
        Cypress._.times(30, (postNumber) => {
            cy.postMessageAs({sender: otherUser, message: `P${postNumber}`, channelId: testChannel.id});
        });

        // # Make a final post from the user 1 where reaction will be added
        cy.postMessage('This post will have a reaction');

        // # Scroll to top of the channel to first post
        cy.getNthPostId(1).then((firstPostId) => {
            cy.get(`#post_${firstPostId}`).should('exist').scrollIntoView();
        });

        // # Get the last posted message
        cy.getLastPostId().then((lastPostID) => {
            // # Add a reaction to the last post with another user
            cy.reactToMessageAs({sender: otherUser, postId: lastPostID, reaction: 'smile'});
        });

        // * Verify that new message bar is not visible even after a new reaction
        // was added to the message in the bottom
        cy.get('.toast.toast__visible').should('not.exist');
    });

    it('MM-T566 New message bar - Displays in permalink view', () => {
        // # Visit town-square once so that when user A came back, the new messages bar will appear
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);

        // # Post some messages in town-square channel
        cy.postMessageAs({
            sender: otherUser,
            message: 'message from user B',
            channelId: townChannelId,
        });

        // # Enter "in:town-square" in the search bar and hit ENTER
        cy.get('#searchBox').type('in:town-square').type('{enter}', {force: true}).type('{enter}', {force: true});

        // # Click "Jump" to one of the search results
        cy.get('a.search-item__jump').last().click();

        // * Verify permalink in main channel view (post highlighted, fades in 6sec.)
        cy.getNthPostId(1).then((postIdTest) => {
            cy.get(`#post_${postIdTest}`, {timeout: TIMEOUTS.HALF_MIN}).should('have.class', 'post--highlight');
            cy.clock();

            Cypress._.times(15, (postNumber) => {
                cy.postMessageAs({sender: otherUser, message: `P${postNumber}`, channelId: townChannelId});
            });

            cy.tick(6000);
            cy.get(`#post_${postIdTest}`).should('not.have.class', 'post--highlight');
        });

        // * Verify New message bar appears if user is not within the view of the channel bottom (updated for 5.22)
        cy.get('.NotificationSeparator').should('exist');
    });
});

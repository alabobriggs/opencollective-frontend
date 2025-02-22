import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Flex, Box } from '@rebass/grid';
import styled from 'styled-components';
import { get, isEmpty } from 'lodash';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { Lock } from 'styled-icons/fa-solid';

import { formatDate } from '../../lib/utils';
import { H3, P } from '../Text';
import Container from '../Container';
import MessageBox from '../MessageBox';
import StyledTooltip from '../StyledTooltip';
import StyledCard from '../StyledCard';
import Link from '../Link';
import Avatar from '../Avatar';
import StyledButton from '../StyledButton';

import ContainerSectionContent from './ContainerSectionContent';
import { UpdatesFieldsFragment } from './fragments';

/** Query to re-fetch updates */
const UpdatesQuery = gql`
  query NewCollectivePage($slug: String!, $onlyPublishedUpdates: Boolean) {
    Collective(slug: $slug) {
      id
      updates(limit: 3, onlyPublishedUpdates: $onlyPublishedUpdates) {
        ...UpdatesFieldsFragment
      }
    }
  }

  ${UpdatesFieldsFragment}
`;

const PrivateUpdateMesgBox = styled(MessageBox)`
  height: 40px;
  background: #f0f8ff;
  border: 1px solid #b8deff;
  box-sizing: border-box;
  border-radius: 6px;
  margin-top: 10px;
  padding: 10px;
  font-size: 12px;
  color: #71757a;
  display: flex;
  align-items: center;
`;

/**
 * This section is a temporary replacement for the `Conversations` section that
 * will come later. It follows the design specified for it.
 */
class SectionUpdates extends React.Component {
  static propTypes = {
    /** Collective */
    collective: PropTypes.shape({
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,

    /** Does user can see drafts? */
    canSeeDrafts: PropTypes.bool.isRequired,

    /** Is user loggedIn? */
    isLoggedIn: PropTypes.bool.isRequired,

    /** Transactions */
    data: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
      Collective: PropTypes.shape({
        updates: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number,
            slug: PropTypes.string,
            title: PropTypes.string,
            summary: PropTypes.string,
            createdAt: PropTypes.string,
            publishedAt: PropTypes.string,
            isPrivate: PropTypes.bool,
            userCanSeeUpdate: PropTypes.bool,
            fromCollective: PropTypes.shape({
              id: PropTypes.number,
              type: PropTypes.string,
              name: PropTypes.string,
              slug: PropTypes.string,
              image: PropTypes.string,
            }),
          }),
        ),
      }),
    }),
  };

  componentDidUpdate(oldProps) {
    // If user log in/out we need to refresh data as it depends on the current user
    if (oldProps.isLoggedIn !== this.props.isLoggedIn) {
      this.props.data.refetch();
    }
  }

  render() {
    const { collective, canSeeDrafts } = this.props;
    const updates = get(this.props.data, 'Collective.updates', []);

    // Nothing to show if updates is empty and user can't add new ones
    if (isEmpty(updates) && !canSeeDrafts) {
      return null;
    }

    return (
      <ContainerSectionContent py={[5, 6]}>
        <H3 mb={3} fontSize={['H4', 'H2']} fontWeight="normal" color="black.900">
          <FormattedMessage id="CollectivePage.SectionUpdates.Title" defaultMessage="Latest updates" />
        </H3>
        {isEmpty(updates) ? (
          <div>
            <MessageBox my={5} type="info" withIcon maxWidth={700} fontStyle="italic" fontSize="Paragraph">
              <FormattedMessage
                id="SectionUpdates.PostFirst"
                defaultMessage="Use this section to promote your actions and keep your community up-to-date."
              />
            </MessageBox>
            <Link route="createUpdate" params={{ collectiveSlug: collective.slug }}>
              <StyledButton buttonSize="large" width={1}>
                <FormattedMessage id="SectionUpdates.CreateBtn" defaultMessage="Post an update" />
              </StyledButton>
            </Link>
          </div>
        ) : (
          <StyledCard>
            {updates.map((update, idx) => (
              <Container
                key={update.id}
                p={24}
                display="flex"
                justifyContent="space-between"
                borderBottom={idx === updates.length - 1 ? undefined : '1px solid #e6e8eb'}
              >
                <Flex>
                  <Box mr={3}>
                    <Avatar
                      src={update.fromCollective.image}
                      type={update.fromCollective.type}
                      name={update.fromCollective.name}
                      radius={40}
                    />
                  </Box>
                  <Flex flexDirection="column" justifyContent="space-between">
                    <Link route="update" params={{ collectiveSlug: collective.slug, updateSlug: update.slug }}>
                      <P color="black.900" fontWeight="600">
                        {update.title}
                      </P>
                    </Link>
                    {update.userCanSeeUpdate ? (
                      <P color="black.700" dangerouslySetInnerHTML={{ __html: update.summary }} />
                    ) : (
                      <PrivateUpdateMesgBox type="info" data-cy="mesgBox">
                        <FormattedMessage
                          id="update.private.cannot_view_message"
                          defaultMessage="Become a backer of {collective} to see this update"
                          values={{ collective: collective.name }}
                        />
                      </PrivateUpdateMesgBox>
                    )}
                    <Container color="black.400" mt={2} fontSize="Caption">
                      {update.isPrivate && (
                        <StyledTooltip
                          content={() => (
                            <FormattedMessage id="update.private.lock_text" defaultMessage="This update is private" />
                          )}
                        >
                          <Box mr={1}>
                            <Lock
                              data-tip
                              data-for="privateLockText"
                              data-cy="privateIcon"
                              size={12}
                              cursor="pointer"
                            />
                          </Box>
                        </StyledTooltip>
                      )}
                      {update.publishedAt ? (
                        <FormattedMessage
                          id="update.publishedAtBy"
                          defaultMessage="Published on {date} by {author}"
                          values={{
                            date: formatDate(update.publishedAt, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }),
                            author: update.fromCollective.name,
                          }}
                        />
                      ) : (
                        <FormattedMessage
                          id="update.createdAtBy"
                          defaultMessage={'Created on {date} (draft) by {author}'}
                          values={{
                            date: formatDate(update.createdAt),
                            author: update.fromCollective.name,
                          }}
                        />
                      )}
                    </Container>
                  </Flex>
                </Flex>
              </Container>
            ))}
          </StyledCard>
        )}
        {updates.length > 0 && (
          <Link route="updates" params={{ collectiveSlug: collective.slug }}>
            <StyledButton buttonSize="large" mt={3} width={1}>
              <FormattedMessage id="CollectivePage.SectionUpdates.ViewAll" defaultMessage="View all updates" /> →
            </StyledButton>
          </Link>
        )}
      </ContainerSectionContent>
    );
  }
}

export default injectIntl(
  graphql(UpdatesQuery, {
    options(props) {
      return {
        variables: {
          slug: props.collective.slug,
          onlyPublishedUpdates: !props.canSeeDrafts,
        },
      };
    },
  })(SectionUpdates),
);

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { get } from 'lodash';
import { Box, Flex } from '@rebass/grid';
import styled from 'styled-components';

import { Facebook } from 'styled-icons/fa-brands/Facebook';
import { Twitter } from 'styled-icons/fa-brands/Twitter';

import orderSuccessBackgroundUrl from '../static/images/order-success-background.svg';

import { tweetURL, facebooKShareURL, objectToQueryString } from '../lib/url_helpers';
import { formatCurrency } from '../lib/utils';
import { Link } from '../server/pages';
import { withUser } from '../components/UserProvider';
import { H3, P, Span } from '../components/Text';
import ErrorPage from '../components/ErrorPage';
import Page from '../components/Page';
import StyledButton from '../components/StyledButton';
import StyledLink from '../components/StyledLink';
import Loading from '../components/Loading';
import OrderSuccessContributorCardWithData from '../components/OrderSuccessContributorCardWithData';
import MessageBox from '../components/MessageBox';

const OrderSuccessContainer = styled(Flex)`
  background: white url(${orderSuccessBackgroundUrl}) 0 0/100% no-repeat;
  min-height: 500px;

  @media (max-width: 1440px) {
    background-size: 1440px 304px;
  }
`;

const ShareLink = styled(StyledLink)`
  display: flex;
  justify-content: center;
  align-items: center;
  svg {
    margin-right: 8px;
  }
`;
ShareLink.defaultProps = {
  width: 160,
  buttonStyle: 'standard',
  buttonSize: 'medium',
  fontWeight: 600,
  mx: 2,
  mb: 2,
  target: '_blank',
  omitProps: StyledLink.defaultProps.omitProps,
};

const GetOrderQuery = gql`
  query OrderSuccess($OrderId: Int!) {
    Order(id: $OrderId) {
      id
      quantity
      totalAmount
      interval
      currency
      status
      fromCollective {
        id
        slug
        name
        image
        path
      }
      collective {
        id
        slug
        name
        tags
        path
      }
      tier {
        id
        type
        name
        amount
        presets
      }
      paymentMethod {
        id
      }
    }
  }
`;

class OrderSuccessPage extends React.Component {
  static propTypes = {
    OrderId: PropTypes.number.isRequired,
    data: PropTypes.object.isRequired, // from withData
    intl: PropTypes.object.isRequired, // from injectIntl
    loggedInUserLoading: PropTypes.bool, // from withUser
    LoggedInUser: PropTypes.object, // from withUser
  };

  static getInitialProps({ query: { OrderId } }) {
    return { OrderId: parseInt(OrderId) };
  }

  constructor(props) {
    super(props);

    this.messages = defineMessages({
      tweet: {
        id: 'order.created.tweet',
        defaultMessage: "I've just donated {amount} to {collective}. Consider donating too, every little helps!",
      },
      'tweet.event': {
        id: 'order.created.tweet.event',
        defaultMessage: "I'm attending {event}. Join me!",
      },
    });
  }

  renderUserProfileBtn(loading = false) {
    return (
      <StyledButton buttonStyle="primary" fontWeight={600} loading={loading}>
        <FormattedMessage id="viewYourProfile" defaultMessage="View your profile" />
      </StyledButton>
    );
  }

  getTwitterMessage() {
    const { collective, totalAmount, currency } = this.props.data.Order;
    let msgId = 'tweet';
    const values = {
      collective: collective.twitterHandle ? `@${collective.twitterHandle}` : collective.name,
      amount: formatCurrency(totalAmount, currency, { precision: 0 }),
    };
    if (collective.type === 'EVENT') {
      msgId = 'tweet.event';
      values.event = collective.name;
    }
    return this.props.intl.formatMessage(this.messages[msgId], values);
  }

  renderContributionSummary(tier, collective, fromCollective) {
    if (!tier) {
      return (
        <FormattedMessage
          id="contributeFlow.successMessageBacker"
          defaultMessage="{fromCollectiveName, select, anonymous {You're} other {{fromCollectiveName} is}} now a backer of {collectiveName}!"
          values={{
            fromCollectiveName: fromCollective.name,
            collectiveName: collective.name,
          }}
        />
      );
    }

    return tier.type === 'TICKET' ? (
      <FormattedMessage
        id="contributeFlow.successMessageTicket"
        defaultMessage="{fromCollectiveName, select, anonymous {You've} other {{fromCollectiveName} has}} registered for the event {eventName} ({tierName})"
        values={{
          fromCollectiveName: fromCollective.name,
          eventName: <strong>{collective.name}</strong>,
          tierName: get(tier, 'name', 'ticket'),
        }}
      />
    ) : (
      <FormattedMessage
        id="contributeFlow.successMessage"
        defaultMessage="{fromCollectiveName, select, anonymous {You're} other {{fromCollectiveName} is}} now a member of {collectiveName}'s '{tierName}' tier!"
        values={{
          fromCollectiveName: fromCollective.name,
          collectiveName: <strong>{collective.name}</strong>,
          tierName: get(tier, 'name', 'backer'),
        }}
      />
    );
  }

  render() {
    const { data, LoggedInUser, loggedInUserLoading } = this.props;

    if (data.loading) {
      return <Loading />;
    } else if (data.error || !data.Order) {
      return <ErrorPage data={data} />;
    }

    const order = data.Order;
    const { collective, fromCollective, tier } = order;
    const referralOpts = objectToQueryString({ referral: fromCollective.id });
    const websiteUrl = process.env.WEBSITE_URL || 'https://opencollective.com';
    const referralURL = `${websiteUrl}${collective.path}/${referralOpts}`;
    const message = this.getTwitterMessage();
    const isFreeTier = get(tier, 'amount') === 0 || (get(tier, 'presets') || []).includes(0);
    const isManualDonation = order.status === 'PENDING' && !order.paymentMethod && !isFreeTier;

    return (
      <Page title={'Contribute'}>
        <OrderSuccessContainer id="page-order-success" flexDirection="column" alignItems="center" mb={6}>
          {isManualDonation ? (
            <MessageBox type="warning" my={4} mx={2}>
              <FormattedMessage
                id="collective.user.orderProcessing.manual"
                defaultMessage="Your donation is pending. Please follow the instructions in the confirmation email to manually pay the host of the collective."
              />
            </MessageBox>
          ) : (
            <Box mt={100} mb={3}>
              <H3 fontWeight={800} color="black.900" mb={3} textAlign="center">
                <FormattedMessage id="contributeFlow.successTitle" defaultMessage="Woot woot! 🎉" />
              </H3>
              <P p={2} textAlign="center" style={{ maxWidth: 600 }}>
                {this.renderContributionSummary(tier, collective, fromCollective)}
              </P>
            </Box>
          )}

          <Box my={[2, 5]}>
            <OrderSuccessContributorCardWithData order={order} fromCollective={fromCollective} />
          </Box>

          <Flex flexWrap="wrap" justifyContent="center" mt={2}>
            <ShareLink href={tweetURL({ url: referralURL, text: message })}>
              <Twitter size="1.2em" color="#38A1F3" />
              <FormattedMessage id="tweetIt" defaultMessage="Tweet it" />
            </ShareLink>
            <ShareLink href={facebooKShareURL({ u: referralURL })}>
              <Facebook size="1.2em" color="#3c5a99" />
              <FormattedMessage id="shareIt" defaultMessage="Share it" />
            </ShareLink>
          </Flex>
          <Box width={64} my={4} bg="black.300" css={{ height: '1px' }} />
          {collective.tags && (
            <Flex flexDirection="column" alignItems="center" mb={4}>
              <Span color="black.600">
                <FormattedMessage
                  id="contributeSuccess.discover"
                  defaultMessage="Discover other related collectives to support:"
                />
              </Span>
              <Flex mt={1} flexWrap="wrap" justifyContent="center" css={{ maxWidth: 500 }}>
                {collective.tags.map(tag => (
                  <Link key={tag} route="search" params={{ q: tag }} passHref>
                    <StyledLink fontSize="Paragraph" lineHeight="Caption" mr={1} textAlign="center">
                      #{tag}
                    </StyledLink>
                  </Link>
                ))}
              </Flex>
            </Flex>
          )}
          {!LoggedInUser && this.renderUserProfileBtn(true)}
          {LoggedInUser && !loggedInUserLoading && (
            <Link route="collective" params={{ slug: get(LoggedInUser, 'collective.slug', '') }} passHref>
              {this.renderUserProfileBtn()}
            </Link>
          )}
        </OrderSuccessContainer>
      </Page>
    );
  }
}

export default withUser(graphql(GetOrderQuery)(injectIntl(OrderSuccessPage)));

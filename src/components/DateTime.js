import React from 'react';
import PropTypes from 'prop-types';
import ReactDateTime from 'react-datetime';
import momentTimezone from 'moment-timezone';

import '../../node_modules/react-datetime/css/react-datetime.css'; // eslint-disable-line node/no-unpublished-import

class DateTime extends React.Component {
  static propTypes = {
    date: PropTypes.string.isRequired,
    timezone: PropTypes.string.isRequired,
  };
  render() {
    const props = this.props;
    const { date, timezone } = props;
    const value = momentTimezone.tz(new Date(date), timezone);

    return <ReactDateTime value={value} {...props} />;
  }
}

export default DateTime;

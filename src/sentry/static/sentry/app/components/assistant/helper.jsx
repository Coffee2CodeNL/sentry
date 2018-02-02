import React from 'react';
import {browserHistory} from 'react-router';
import createReactClass from 'create-react-class';
import $ from 'jquery';
import AssistantHandle from './handle';
import SupportDrawer from './supportDrawer';
import GuideDrawer from './guideDrawer';
import GuideStore from '../../stores/guideStore';
import ApiMixin from '../../mixins/apiMixin';

const AssistantHelper = createReactClass({
  displayName: 'AssistantHelper',

  mixins: [ApiMixin],

  getInitialState() {
    return {
      // Current URL. Determines which guide should be shown.
      pathname: null,
      isDrawerOpen: false,
      // All available guides.
      allGuides: null,
      // We record guides seen on the server, but immediately after a user completes a guide
      // it may not have been synced to the server, so the local copy helps in filtering correctly.
      guidesSeen: new Set(),
      // The 0-based index of the current step of the current guide.
      // Null if the drawer is not open.
      currentStep: null,
    };
  },

  componentWillMount() {
    this.fetchGuides();
    this.handleLocationChange(window.location.pathname);
    this.unlisten = browserHistory.listen(location => {
      this.handleLocationChange(location.pathname);
    });
  },

  componentDidUpdate(prevProps, prevState) {
    const guide = this.currentGuide();
    // Scroll to the element referenced by the current guide.
    if (
      guide &&
      this.state.isDrawerOpen &&
      this.state.currentStep !== prevState.currentStep
    ) {
      const elementID = guide.steps[this.state.currentStep].elementID;
      GuideStore.setStep(this.state.currentStep);
      if (elementID) {
        $('html, body').animate(
          {
            scrollTop: $('#' + elementID).offset().top,
          },
          1000
        );
      }
    }
  },

  componentWillUnmount() {
    this.unlisten();
  },

  handleLocationChange(pathname) {
    if (this.state.pathname != pathname) {
      this.setState({
        pathname,
        isDrawerOpen: false,
        currentStep: null,
      });
    }
  },

  // Return the guide to show on the current page.
  currentGuide() {
    if (!this.state.allGuides) {
      return null;
    }
    if (
      this.state.pathname.match(/\/issues\/\d+\/([?]|$)/) &&
      this.state.allGuides.issue &&
      !this.state.guidesSeen.has(this.state.allGuides.issue.id)
    ) {
      return this.state.allGuides.issue;
    }
    return null;
  },

  fetchGuides() {
    this.api.request('/assistant/', {
      method: 'GET',
      success: response => {
        this.setState({
          allGuides: response,
        });
      },
    });
  },

  onDrawerOpen() {
    this.setState({
      isDrawerOpen: true,
    });
    const guide = this.currentGuide();
    if (guide) {
      GuideStore.setGuide(guide);
      this.setState({
        currentStep: 0,
      });
    }
  },

  onDrawerClose(useful = null) {
    // `useful` is a boolean if the user was on the last step of the guide and
    // submitted feedback about whether the guide was useful. Otherwise it's null.
    const guide = this.currentGuide();
    if (guide) {
      if (this.state.currentStep < guide.steps.length - 1) {
        // User dismissed the guide before completing it.
        // TODO(adhiraj): Retry logic?
        /*this.api.request('/assistant/', {
          method: 'PUT',
          data: {
            guide_id: guide.id,
            status: 'dismissed',
          },
        });*/
      } else {
        // User completed the guide.
        const data = {
          guide_id: guide.id,
          status: 'viewed',
        };
        if (useful !== null) {
          data.useful = useful;
        }
        /*this.api.request('/assistant/', {
          method: 'PUT',
          data: data,
        });*/
      }
      this.setState({
        guidesSeen: this.state.guidesSeen.add(guide.id),
      });
    }
    this.setState({
      isDrawerOpen: false,
      currentStep: null,
    });
  },

  nextHandler() {
    this.setState(prevState => {
      return {
        currentStep: prevState.currentStep + 1,
      };
    });
  },

  usefulHandler() {
    this.onDrawerClose(true);
  },

  notUsefulHandler() {
    this.onDrawerClose(false);
  },

  render() {
    const guide = this.currentGuide();
    const cue = guide ? guide.cue : 'Need Help?';
    return (
      <div className="assistant-container">
        {this.state.isDrawerOpen ? (
          <div className="assistant-drawer">
            {guide ? (
              <GuideDrawer
                guide={guide}
                step={this.state.currentStep}
                nextHandler={this.nextHandler}
                dismissHandler={() => this.onDrawerClose()}
                usefulHandler={this.usefulHandler}
                notUsefulHandler={this.notUsefulHandler}
              />
            ) : (
              <SupportDrawer closeHandler={this.onDrawerClose} />
            )}
          </div>
        ) : (
          <AssistantHandle cue={cue} onClick={this.onDrawerOpen} />
        )}
      </div>
    );
  },
});

export default AssistantHelper;
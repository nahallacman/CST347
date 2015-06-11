/**
 * MyBlackboard javascript library
 *
 * @since  9.1 SP10
 * @author rshehadeh
 */
var mybb = {

  TOOL_LISTENER_ID  : "mybb",
  CANVAS_ID         : "mybbCanvas",

  TOOL_ID_SEPARATOR : "_____",


  /**
   * Set up MyBb
   *
   * @param initialToolUri  The URI of the tool to display when MyBb first appears
   */
  setup: function( initialToolUri ) {

    // define resizing behavior for mybb
    Event.observe( window, "resize", this.resizeCanvas );

    // listen for messages coming in from our child tools
    Event.observe ( window, "message", this.handleToolMessage );

    // arrange for our own dissolution
    Event.observe ( window, "unload", this.teardown );

    // initialize the tool_service
    top.tool_service.register ( mybb.TOOL_LISTENER_ID, this.activityListener );

    // load up the chosen tool
    $( mybb.CANVAS_ID ).src = initialToolUri;

    overflow_handler.init( "mybbListTools", mybb.getWindowHeight );
  },


  /**
   * Resize the tool canvas to reflect the current size of the browser window.
   */
  resizeCanvas : function() {

    var winH = mybb.getWindowHeight();

    var bbCanv = $( mybb.CANVAS_ID );
    if ( bbCanv ) {
      bbCanv.style.height = winH - 12 + 'px';
    }

  },

  getWindowHeight : function() {
    var winH;

    if ( window.innerHeight ) {
      winH = window.innerHeight;
    }

    else if ( window.document.documentElement && window.document.documentElement.clientHeight ) {
      winH = window.document.documentElement.clientHeight;
    }

    else {
      winH = document.body.offsetHeight;
    }

    return winH;
  },

  /**
   * Switch to the tool with the given id.
   *
   * This function also gets fresh activity data for both the previous and the newly-
   * selected tool.
   *
   * @selectedToolId  The id of the tool we're switching to
   */
  switchTool: function ( selectedToolId ) {

    var selectedTool = $(selectedToolId);
    var currentTool = $$('#side_nav li.active').first();

    var tabs = $$( '#side_nav > ul > li' );

    tabs.each( function( e )  {
      e.className = '';
    } );

    selectedTool.addClassName( 'active' );

    // get the latest badge counts for both the current and selected tools
    if ( selectedTool.id )
    {
      top.tool_service.getActivityDataForTool ( selectedTool.id );
    }

    if ( currentTool.id )
    {
      top.tool_service.getActivityDataForTool ( currentTool.id );
    }

    // set the title of the my bb canvas to the selected tool and focus the iframe
    $( mybb.CANVAS_ID ).title = $( selectedToolId ).down( "a" ).title;
    $( mybb.CANVAS_ID ).focus();

    // close the more tools menu if available and visible
    var myBbMoreTools = $('mybbMoreTools');
    if ( myBbMoreTools && myBbMoreTools.visible() )
    {
      myBbMoreTools.hide();
    }

  },


  /**
   * Get the id of the currently-selected tool.
   *
   * @return Tool id. Or undefined, if no tool is selected
   */
  getCurrentToolId : function ( currentTool ) {

    var activeTool = $$('#side_nav li.active');
    return activeTool ? activeTool.first().id : undefined;

  },


  /**
   * Handle incoming messages from MyBb tools.
   *
   * @param event A postMessage
   */
  handleToolMessage : function ( event ) {

    if ( event.data )
    {
      // TODO make sure the origin is one of the registered tools

      // request to make a given tool active
      if( event.data.type === "switchTool" )
      {
        var fullToolId = event.data.pluginId + mybb.TOOL_ID_SEPARATOR + event.data.toolId;
        var selectedTool = $(fullToolId);

        /* make sure that the selectedTool exists and differs from the
         * currently active tool before switching the active tool
         */
        if ( selectedTool && mybb.getCurrentToolId() != fullToolId )
        {
          mybb.switchTool ( selectedTool );
        }
      }
    }
  },


  /**
   * Pull MyBlackboard apart
   */
  teardown: function () {
    top.tool_service.unregister (mybb.TOOL_LISTENER_ID);
  },


  /**
   * Inserts the tool activity value in the badge element.
   *
   * @param toolId         The tool whose activity we're showing
   * @param activityCount  The count
   */
  showActivityValue: function(toolId, activityCount) {

    var badge = $(toolId + "::badge");

    if ( badge ) {

      // update the badge
      var badgeValue = top.tool_service.formatCount(activityCount, top.tool_service.MAX_TOOL_COUNT);
      badge.innerHTML = badgeValue;
      badge.show();

      // update the screen reader img to include activity data
      var altImg = $(toolId + "_altImg");

      altImg.alt =
        altImg.getAttribute("data-tool-title") + " - " +
          page.bundle.getString("mybb.tool.activity.description", badgeValue );

    }

  },


  /**
   * Get rid of all signs of a tool's activity count.
   *
   * @param toolId  The id of the tool whose activity count is being cleared
   */
  removeActivityValue: function( toolId ) {

    var badge = $(toolId + "::badge");

    if ( badge ) {

      badge.hide();
      var altImg = $(toolId + "_altImg");
      altImg.alt = altImg.getAttribute("data-tool-title");

    }

  },


  /**
   * The listener we register for activity update events
   */
  activityListener : {

    activityCountsUpdated : function () {

      if ( top.tool_service.getActivityCounts() ) {

        top.tool_service.getActivityCounts().each ( function ( pair ) {

          // if the tool has any activity, display its badge
          if ( pair.value > 0 ) {
            mybb.showActivityValue ( pair.key, pair.value );
          }

          // ... otherwise hide it
          else {
            mybb.removeActivityValue ( pair.key );
          }

        });

      }

    },

    activityCountUpdated : function ( toolId ) {

      var badgeValue = top.tool_service.getActivityCountForTool(toolId);

      if ( badgeValue && badgeValue > 0 ) {
        mybb.showActivityValue ( toolId, badgeValue );
      }

      else {
        mybb.removeActivityValue ( toolId );
      }

    }

  },


  /**
   * Attaches events to MyBb shortcuts in the global nav menu.
   *
   * @param toolIds  The ids of the shortcuts to attach events to
   */
  attachShortcutHandler: function ( toolIds ) {

    // a handler that de-selects all top-level tabs
    toolIds.each( function ( toolId ) {
      Event.observe ( $(toolId), "click", function () {
        var activeTab = top.frames.nav.$$('table#appTabList td[class=active]') ;
        if ( activeTab.size() ){ activeTab.first().removeClassName('active'); }
      });
    });

  }

};
